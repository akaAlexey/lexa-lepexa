import type { ArService, ImageTrackingSession } from '../types.ts'

/**
 * Дополненная реальность в браузере: MindAR узнаёт снимок в камере, three.js кладёт поверх ролик.
 * Обе библиотеки грузятся с jsDelivr только при открытии камеры — остальное приложение не тяжелеет.
 * Версии совпадают с картой импорта в index.html (MindAR импортирует `three` по имени).
 * В Android (Capacitor) этот же веб-AR работает внутри WebView.
 */
export const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
export const MINDAR_URL =
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js'

/* Минимальные типы тех частей библиотек, которые мы используем. */
interface Disposable {
  dispose(): void
}
export interface ThreeModule {
  VideoTexture: new (video: HTMLVideoElement) => Disposable & { colorSpace: string }
  SRGBColorSpace: string
  PlaneGeometry: new (w: number, h: number) => Disposable
  MeshBasicMaterial: new (p: { map: unknown }) => Disposable
  Mesh: new (g: unknown, m: unknown) => object
}
interface Anchor {
  group: { add(o: object): void }
  onTargetFound?: (() => void) | undefined
  onTargetLost?: (() => void) | undefined
}
interface MindArThree {
  renderer: {
    setAnimationLoop(cb: (() => void) | null): void
    render(s: unknown, c: unknown): void
  }
  scene: unknown
  camera: unknown
  addAnchor(index: number): Anchor
  start(): Promise<void>
  stop(): void
}
export interface MindArModule {
  MindARThree: new (options: Record<string, unknown>) => MindArThree
}

/** Загрузка библиотек. В тестах подменяется — сеть не нужна. */
export type ArLibraries = () => Promise<{ THREE: ThreeModule; MindAR: MindArModule }>

const loadFromCdn: ArLibraries = async () => ({
  THREE: (await import(/* @vite-ignore */ THREE_URL)) as ThreeModule,
  MindAR: (await import(/* @vite-ignore */ MINDAR_URL)) as MindArModule,
})

const abortError = () => new DOMException('Запуск камеры отменён', 'AbortError')

/**
 * Гасит камеру, которую MindAR включил в контейнере. Нужна, когда `mindar.stop()` бессилен:
 * если распознавание ещё не запустилось (цель не загрузилась), MindAR падает раньше,
 * чем доходит до остановки дорожек, и камера остаётся гореть.
 */
function releaseCamera(container: HTMLElement) {
  for (const el of container.querySelectorAll('video')) {
    const stream = el.srcObject as MediaStream | null
    if (stream && typeof stream.getTracks === 'function') {
      for (const track of stream.getTracks()) track.stop()
    }
    el.srcObject = null
  }
}

export function createWebAr(load: ArLibraries = loadFromCdn): ArService {
  return {
    async trackImage({ container, targetUrl, video, aspect, onFound, onLost, signal }) {
      if (signal?.aborted) throw abortError()
      // Камера в браузере доступна только на https (и localhost): на http getUserMedia просто нет
      if (window.isSecureContext === false)
        throw new Error('Камера работает только на защищённом адресе (https://)')
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Камера недоступна в этом браузере')

      const { THREE, MindAR } = await load()
      if (signal?.aborted) throw abortError()

      const mindar = new MindAR.MindARThree({
        container,
        imageTargetSrc: targetUrl,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        // Плавнее и без дрожания на слабых телефонах
        filterMinCF: 0.0001,
        filterBeta: 0.001,
      })
      const texture = new THREE.VideoTexture(video)
      texture.colorSpace = THREE.SRGBColorSpace
      // Якорь MindAR: ширина снимка = 1, высота = aspect
      const geometry = new THREE.PlaneGeometry(1, aspect)
      const material = new THREE.MeshBasicMaterial({ map: texture })
      const anchor = mindar.addAnchor(0)
      anchor.group.add(new THREE.Mesh(geometry, material))
      // Колбэки — только пока сессия жива: поздние события MindAR после остановки не трогают экран
      let alive = true
      anchor.onTargetFound = () => {
        if (alive) onFound()
      }
      anchor.onTargetLost = () => {
        if (alive) onLost()
      }

      const stop = () => {
        if (!alive) return
        alive = false
        anchor.onTargetFound = undefined
        anchor.onTargetLost = undefined
        mindar.renderer.setAnimationLoop(null)
        try {
          mindar.stop()
        } catch {
          // MindAR не успел запуститься — камеру гасим сами ниже
        }
        releaseCamera(container)
        texture.dispose()
        geometry.dispose()
        material.dispose()
      }

      // Запуск MindAR может не завершиться вовсе (цель .mind не загрузилась) — отмена обрывает ожидание
      const aborted = new Promise<never>((_, reject) => {
        signal?.addEventListener('abort', () => reject(abortError()), { once: true })
      })
      try {
        await Promise.race([mindar.start(), aborted])
      } catch (e) {
        stop()
        throw e
      }

      mindar.renderer.setAnimationLoop(() => mindar.renderer.render(mindar.scene, mindar.camera))
      const session: ImageTrackingSession = { stop }
      return session
    },
  }
}
