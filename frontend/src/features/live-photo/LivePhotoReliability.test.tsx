import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImageTrackingOptions, ImageTrackingSession } from '../../platform/types.ts'
import { renderApp } from '../../test/renderApp.tsx'
import { START_TIMEOUT_MS } from './arErrors.ts'

let play: ReturnType<typeof vi.spyOn>
let pause: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  // В jsdom нет воспроизведения медиа
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** AR-сервис, которым тест управляет сам: когда запуск завершится и что придёт от камеры. */
function controllableAr() {
  const calls: ImageTrackingOptions[] = []
  const stop = vi.fn<() => void>()
  let resolve: ((s: ImageTrackingSession) => void) | undefined
  const ar = {
    trackImage: (o: ImageTrackingOptions) => {
      calls.push(o)
      return new Promise<ImageTrackingSession>((r) => {
        resolve = r
      })
    },
  }
  return {
    ar,
    calls,
    stop,
    // Запуск камеры завершился: ждём, пока экран обработает сессию
    start: () =>
      act(async () => {
        resolve?.({ stop })
        await Promise.resolve()
      }),
  }
}

async function openCamera() {
  await userEvent.click(await screen.findByTestId('live-consent'))
  await userEvent.click(screen.getByTestId('live-open-camera'))
}

describe('«Живое фото»: согласие', () => {
  it('до согласия ролик не подгружается, камеры и плеера нет', async () => {
    renderApp('/live/soldier', { signedIn: true })
    const video = await screen.findByTestId('live-video')
    expect(video).toHaveAttribute('preload', 'none')
    expect(video).not.toHaveAttribute('controls')
    expect(screen.getByTestId('live-open-camera')).toBeDisabled()
    expect(screen.getByTestId('live-watch-video')).toBeDisabled()
  })

  it('согласие сняли во время просмотра — плеер закрыт, ролик на паузе, кнопки снова неактивны', async () => {
    renderApp('/live/reichstag', { signedIn: true })
    await userEvent.click(await screen.findByTestId('live-consent'))
    await userEvent.click(screen.getByTestId('live-watch-video'))
    expect(screen.getByTestId('live-video')).toHaveAttribute('controls')
    await userEvent.click(screen.getByTestId('live-consent'))
    expect(screen.getByTestId('live-video')).not.toHaveAttribute('controls')
    expect(pause).toHaveBeenCalled()
    expect(screen.getByTestId('live-watch-video')).toBeDisabled()
  })

  it('Escape закрывает экран камеры и гасит камеру', async () => {
    const c = controllableAr()
    renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    await openCamera()
    await c.start()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('live-ar')).not.toBeInTheDocument()
    expect(c.stop).toHaveBeenCalled()
  })
})

describe('«Живое фото»: камера', () => {
  it('найден снимок — ролик играет, потерян — пауза; поздние события после закрытия не трогают ролик', async () => {
    const c = controllableAr()
    renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    await openCamera()
    await c.start()
    play.mockClear()
    pause.mockClear()
    act(() => c.calls[0]!.onFound())
    expect(play).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('live-ar-status')).toHaveTextContent('Снимок ожил')
    act(() => c.calls[0]!.onLost())
    expect(pause).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByTestId('live-ar-close'))
    play.mockClear()
    act(() => c.calls[0]!.onFound())
    expect(play).not.toHaveBeenCalled()
  })

  it.each([
    ['NotAllowedError', 'Доступ к камере запрещён'],
    ['NotFoundError', 'не нашлась подходящая камера'],
    ['NotReadableError', 'Камера занята другим приложением'],
  ])('%s — понятная причина и переход к ролику с пометкой ИИ', async (name, text) => {
    renderApp('/live/soldier', {
      signedIn: true,
      platform: { ar: { trackImage: () => Promise.reject(new DOMException('x', name)) } },
    })
    await openCamera()
    expect(await screen.findByTestId('live-ar-status')).toHaveTextContent(text)
    await userEvent.click(screen.getByTestId('live-ar-fallback'))
    expect(screen.queryByTestId('live-ar')).not.toBeInTheDocument()
    expect(screen.getByTestId('live-video')).toHaveAttribute('controls')
    expect(screen.getByTestId('live-video-ai-label')).toHaveTextContent(
      'Реконструкция с помощью ИИ',
    )
  })

  it('http-адрес — объяснение про https и ролик без камеры', async () => {
    renderApp('/live/soldier', {
      signedIn: true,
      platform: {
        ar: {
          trackImage: () =>
            Promise.reject(new Error('Камера работает только на защищённом адресе (https://)')),
        },
      },
    })
    await openCamera()
    expect(await screen.findByTestId('live-ar-status')).toHaveTextContent('https://')
    expect(screen.getByTestId('live-ar-fallback')).toBeInTheDocument()
  })

  it('запуск завис — через 20 с отмена, камера гаснет, предложены повтор и ролик', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const c = controllableAr()
    renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    await openCamera()
    expect(screen.getByTestId('live-ar-status')).toHaveTextContent('Включаем камеру')
    act(() => vi.advanceTimersByTime(START_TIMEOUT_MS))
    expect(c.calls[0]!.signal?.aborted).toBe(true)
    expect(screen.getByTestId('live-ar-status')).toHaveTextContent('не запустилась за 20 секунд')
    expect(screen.getByTestId('live-ar-retry')).toBeInTheDocument()
    // Запуск всё-таки завершился после таймаута — сессию сразу останавливаем
    await c.start()
    expect(c.stop).toHaveBeenCalled()
  })

  it('«Включить камеру снова» — новый запуск с нуля', async () => {
    let attempts = 0
    renderApp('/live/soldier', {
      signedIn: true,
      platform: {
        ar: {
          trackImage: () => {
            attempts += 1
            return Promise.reject(new DOMException('x', 'NotReadableError'))
          },
        },
      },
    })
    await openCamera()
    await userEvent.click(await screen.findByTestId('live-ar-retry'))
    await vi.waitFor(() => expect(attempts).toBe(2))
  })

  it('вкладку свернули — камера гаснет, ролик на паузе; вернулись — «Включить камеру снова»', async () => {
    const c = controllableAr()
    renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    await openCamera()
    await c.start()
    pause.mockClear()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    visibility.mockRestore()
    expect(c.stop).toHaveBeenCalledTimes(1)
    expect(pause).toHaveBeenCalled()
    expect(screen.getByTestId('live-ar-status')).toHaveTextContent('Камера выключена')
    await userEvent.click(screen.getByTestId('live-ar-retry'))
    expect(c.calls).toHaveLength(2)
  })

  it('уход со страницы (pagehide) — камера гаснет', async () => {
    const c = controllableAr()
    renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    await openCamera()
    await c.start()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(c.stop).toHaveBeenCalledTimes(1)
  })

  it('ушли с экрана во время запуска камеры — запуск отменён, обработчики сняты', async () => {
    const c = controllableAr()
    const removeDoc = vi.spyOn(document, 'removeEventListener')
    const removeWin = vi.spyOn(window, 'removeEventListener')
    const { router } = renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    await openCamera()
    await act(() => router.navigate('/live'))
    expect(c.calls[0]!.signal?.aborted).toBe(true)
    expect(removeDoc.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['visibilitychange', 'keydown']),
    )
    expect(removeWin.mock.calls.map(([type]) => type)).toContain('pagehide')
    // Запуск завершился уже после ухода — сессия сразу остановлена
    await c.start()
    expect(c.stop).toHaveBeenCalled()
  })
})

describe('«Живое фото»: пометка ИИ и субтитры', () => {
  /** Дорожка субтитров, которой управляет тест: в jsdom настоящих textTracks нет. */
  function fakeTrack() {
    const track = Object.assign(new EventTarget(), {
      mode: 'showing' as TextTrackMode,
      activeCues: null as unknown,
    })
    vi.spyOn(HTMLMediaElement.prototype, 'textTracks', 'get').mockReturnValue([
      track,
    ] as unknown as TextTrackList)
    return track
  }

  it('в камере текущая реплика видна внизу, дорожка скрыта; после закрытия — снова как была', async () => {
    const track = fakeTrack()
    const c = controllableAr()
    renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    await openCamera()
    await c.start()
    expect(track.mode).toBe('hidden')
    act(() => c.calls[0]!.onFound())
    track.activeCues = [{ text: 'Здравствуй, потомок!' }]
    act(() => {
      track.dispatchEvent(new Event('cuechange'))
    })
    expect(screen.getByTestId('live-ar-cue')).toHaveTextContent('Здравствуй, потомок!')
    expect(screen.getByTestId('live-ai-label')).toHaveTextContent('Реконструкция с помощью ИИ')
    await userEvent.click(screen.getByTestId('live-ar-close'))
    expect(track.mode).toBe('showing')
  })

  it('плеер: русские субтитры по умолчанию и пометка ИИ поверх ролика', async () => {
    renderApp('/live/soldier', { signedIn: true })
    await userEvent.click(await screen.findByTestId('live-consent'))
    await userEvent.click(screen.getByTestId('live-watch-video'))
    const track = screen.getByTestId('live-video').querySelector('track')!
    expect(track).toHaveAttribute('kind', 'captions')
    expect(track).toHaveAttribute('srclang', 'ru')
    expect(track).toHaveAttribute('default')
    expect(screen.getByTestId('live-video-ai-label')).toBeVisible()
  })

  it('ролик назван подготовленным заранее, а не созданным сейчас', async () => {
    renderApp('/live/soldier', { signedIn: true })
    expect(await screen.findByTestId('live-animation')).toHaveTextContent(
      'подготовлен командой заранее',
    )
    const card = screen.getByTestId('screen-live-photo')
    expect(card.textContent).not.toMatch(/в реальном времени|генерируется|создаётся сейчас/i)
  })

  it('список и своё фото не обещают генерацию', async () => {
    renderApp('/live', { signedIn: true })
    const own = await screen.findByTestId('live-own')
    expect(own).toHaveTextContent('в демо не создаётся')
    expect(own).toHaveTextContent('подготовлены командой заранее')
    expect(within(own).queryByText(/нейросеть оживит/)).not.toBeInTheDocument()
  })
})

describe('«Живое фото»: адреса файлов на GitHub Pages', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('снимок, ролик, субтитры и цель камеры идут с базовым путём сборки', async () => {
    vi.stubEnv('BASE_URL', '/lexa-lepexa/')
    const c = controllableAr()
    renderApp('/live/soldier', { signedIn: true, platform: { ar: c.ar } })
    expect(await screen.findByTestId('live-photo-image')).toHaveAttribute(
      'src',
      '/lexa-lepexa/live/soldier.jpg',
    )
    const video = screen.getByTestId('live-video')
    expect(video).toHaveAttribute('src', '/lexa-lepexa/live/soldier.mp4')
    expect(video.querySelector('track')).toHaveAttribute('src', '/lexa-lepexa/live/soldier.vtt')
    await openCamera()
    expect(c.calls[0]!.targetUrl).toBe('/lexa-lepexa/live/soldier.mind')
  })
})
