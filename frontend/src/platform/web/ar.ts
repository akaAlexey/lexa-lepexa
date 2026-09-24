import type { ArService, ImageTrackingSession } from '../types.ts'

/**
 * Дополненная реальность в браузере: MindAR узнаёт снимок в камере, three.js кладёт поверх ролик.
 * Обе библиотеки грузятся с jsDelivr только при открытии камеры — остальное приложение не тяжелеет.
 * Версии совпадают с картой импорта в index.html (MindAR импортирует `three` по имени).
 * В Android (Capacitor) сервис заменяется нативным AR без изменения экранов.
 */
export const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
export const MINDAR_URL =
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js'

/* Минимальные типы тех частей библиотек, которые мы используем. */
interface Disposable {
  dispose(): void
}
interface ThreeModule {
  VideoTexture: new (video: HTMLVideoElement) => Disposable & { colorSpace: string }
  SRGBColorSpace: string
  PlaneGeometry: new (w: number, h: number) => Disposable
  MeshBasicMaterial: new (p: { map: unknown }) => Disposable
  Mesh: new (g: unknown, m: unknown) => object
}
interface Anchor {
  group: { add(o: object): void }
  onTargetFound?: () => void
  onTargetLost?: () => void
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
interface MindArModule {
  MindARThree: new (options: Record<string, unknown>) => MindArThree
}

export function createWebAr(): ArService {
  return {
    async trackImage({ container, targetUrl, video, aspect, onFound, onLost }) {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Камера недоступна в этом браузере')
      const THREE = (await import(/* @vite-ignore */ THREE_URL)) as ThreeModule
      const { MindARThree } = (await import(/* @vite-ignore */ MINDAR_URL)) as MindArModule
      const mindar = new MindARThree({
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
      anchor.onTargetFound = onFound
      anchor.onTargetLost = onLost
      await mindar.start()
      mindar.renderer.setAnimationLoop(() => mindar.renderer.render(mindar.scene, mindar.camera))
      const session: ImageTrackingSession = {
        stop() {
          mindar.renderer.setAnimationLoop(null)
          mindar.stop()
          texture.dispose()
          geometry.dispose()
          material.dispose()
        },
      }
      return session
    },
  }
}
