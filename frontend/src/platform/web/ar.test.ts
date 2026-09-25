import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImageTrackingOptions } from '../types.ts'
import { createWebAr, type ArLibraries, type MindArModule, type ThreeModule } from './ar.ts'

/** Поддельные three и MindAR: проверяем порядок запуска и уборки без камеры и сети. */
function fakeLibraries(start: () => Promise<void>) {
  const disposed: string[] = []
  const disposable = (name: string) =>
    class {
      colorSpace = ''
      dispose() {
        disposed.push(name)
      }
    }
  const THREE = {
    VideoTexture: disposable('texture'),
    SRGBColorSpace: 'srgb',
    PlaneGeometry: disposable('geometry'),
    MeshBasicMaterial: disposable('material'),
    Mesh: function Mesh() {},
  } as unknown as ThreeModule

  const mindar = {
    options: {} as Record<string, unknown>,
    anchor: { group: { add: vi.fn<(o: object) => void>() } } as {
      group: { add: (o: object) => void }
      onTargetFound?: () => void
      onTargetLost?: () => void
    },
    renderer: {
      setAnimationLoop: vi.fn<(cb: (() => void) | null) => void>(),
      render: vi.fn<() => void>(),
    },
    scene: {},
    camera: {},
    start: vi.fn<() => Promise<void>>(start),
    stop: vi.fn<() => void>(),
  }
  const MindAR = {
    // Конструктор, который возвращает общий объект: тест видит тот же экземпляр, что и код
    MindARThree: function MindARThree(opts: Record<string, unknown>) {
      mindar.options = opts
      return Object.assign(mindar, { addAnchor: () => mindar.anchor })
    },
  } as unknown as MindArModule
  const load: ArLibraries = async () => ({ THREE, MindAR })
  return { load, mindar, disposed }
}

/** Контейнер с «камерой», как его оставляет MindAR: <video> с живой дорожкой. */
function containerWithCamera() {
  const container = document.createElement('div')
  const cam = document.createElement('video')
  const track = {
    readyState: 'live',
    stop: vi.fn<() => void>(() => {
      track.readyState = 'ended'
    }),
  }
  Object.defineProperty(cam, 'srcObject', {
    value: { getTracks: () => [track] },
    writable: true,
  })
  container.append(cam)
  return { container, track }
}

function trackingOptions(container: HTMLElement, extra: Partial<ImageTrackingOptions> = {}) {
  return {
    container,
    targetUrl: '/live/soldier.mind',
    video: document.createElement('video'),
    aspect: 716 / 500,
    onFound: vi.fn<() => void>(),
    onLost: vi.fn<() => void>(),
    ...extra,
  }
}

describe('веб-AR: запуск и уборка камеры', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn<() => Promise<MediaStream>>() },
      configurable: true,
    })
  })
  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  })

  it('http-адрес: понятная ошибка про https, библиотеки не грузятся', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    const { load } = fakeLibraries(async () => undefined)
    const spy = vi.fn<ArLibraries>(load)
    await expect(
      createWebAr(spy).trackImage(trackingOptions(document.createElement('div'))),
    ).rejects.toThrow('https')
    expect(spy).not.toHaveBeenCalled()
  })

  it('нет getUserMedia — «Камера недоступна в этом браузере»', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
    const { load } = fakeLibraries(async () => undefined)
    await expect(
      createWebAr(load).trackImage(trackingOptions(document.createElement('div'))),
    ).rejects.toThrow('Камера недоступна')
  })

  it('запуск: цель и пропорции уходят в MindAR, события найден/потерян доходят до экрана', async () => {
    const { load, mindar } = fakeLibraries(async () => undefined)
    const o = trackingOptions(document.createElement('div'))
    await createWebAr(load).trackImage(o)
    expect(mindar.options).toMatchObject({ imageTargetSrc: '/live/soldier.mind' })
    mindar.anchor.onTargetFound?.()
    mindar.anchor.onTargetLost?.()
    expect(o.onFound).toHaveBeenCalledTimes(1)
    expect(o.onLost).toHaveBeenCalledTimes(1)
    expect(mindar.renderer.setAnimationLoop).toHaveBeenLastCalledWith(expect.any(Function))
  })

  it('stop(): рендер, распознавание и камера остановлены, ресурсы освобождены, поздние события молчат', async () => {
    const { load, mindar, disposed } = fakeLibraries(async () => undefined)
    const { container, track } = containerWithCamera()
    const o = trackingOptions(container)
    const session = await createWebAr(load).trackImage(o)
    const found = mindar.anchor.onTargetFound
    session.stop()
    session.stop() // повторный вызов безопасен
    expect(mindar.renderer.setAnimationLoop).toHaveBeenLastCalledWith(null)
    expect(mindar.stop).toHaveBeenCalledTimes(1)
    expect(track.readyState).toBe('ended')
    expect(disposed.sort()).toEqual(['geometry', 'material', 'texture'])
    expect(mindar.anchor.onTargetFound).toBeUndefined()
    found?.()
    expect(o.onFound).not.toHaveBeenCalled()
  })

  it('MindAR упал при запуске — камера погашена, ресурсы освобождены, ошибка дошла до экрана', async () => {
    const { load, mindar, disposed } = fakeLibraries(async () => {
      throw new Error('цель не загрузилась')
    })
    mindar.stop.mockImplementation(() => {
      throw new TypeError('controller is undefined') // как MindAR до конца запуска
    })
    const { container, track } = containerWithCamera()
    await expect(createWebAr(load).trackImage(trackingOptions(container))).rejects.toThrow(
      'цель не загрузилась',
    )
    expect(track.readyState).toBe('ended')
    expect(disposed).toHaveLength(3)
  })

  it('запуск завис — отмена обрывает ожидание, камера гаснет, AbortError', async () => {
    const { load, mindar } = fakeLibraries(() => new Promise<void>(() => undefined))
    const { container, track } = containerWithCamera()
    const controller = new AbortController()
    const started = createWebAr(load).trackImage(
      trackingOptions(container, { signal: controller.signal }),
    )
    await vi.waitFor(() => expect(mindar.start).toHaveBeenCalled())
    controller.abort()
    await expect(started).rejects.toMatchObject({ name: 'AbortError' })
    expect(track.readyState).toBe('ended')
    expect(mindar.renderer.setAnimationLoop).toHaveBeenLastCalledWith(null)
  })

  it('отменили ещё до запуска — камера не включается', async () => {
    const { load, mindar } = fakeLibraries(async () => undefined)
    const controller = new AbortController()
    controller.abort()
    await expect(
      createWebAr(load).trackImage(
        trackingOptions(document.createElement('div'), { signal: controller.signal }),
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(mindar.start).not.toHaveBeenCalled()
  })
})
