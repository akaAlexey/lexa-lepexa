import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { ImageTrackingOptions } from '../../platform/types.ts'
import { renderApp } from '../../test/renderApp.tsx'

beforeAll(() => {
  // В jsdom нет воспроизведения медиа
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

describe('«Живое фото» по QR-коду', () => {
  it('до просмотра: снимок, текст речи, этическая оговорка; без согласия кнопки неактивны', async () => {
    renderApp('/live/soldier', { signedIn: true })
    expect(await screen.findByTestId('live-photo-image')).toHaveAttribute(
      'src',
      '/live/soldier.jpg',
    )
    expect(screen.getByTestId('live-speech')).toHaveTextContent('Здравствуй, потомок!')
    expect(screen.getByTestId('live-ethics')).toHaveTextContent('только для мемориальных целей')
    expect(screen.getByTestId('live-animation')).toHaveTextContent('губы совпадают с речью')
    expect(screen.getByTestId('live-open-camera')).toBeDisabled()
    expect(screen.getByTestId('live-watch-video')).toBeDisabled()
  })

  it('«Смотреть без камеры»: плеер с пометкой ИИ и русскими субтитрами', async () => {
    renderApp('/live/reichstag', { signedIn: true })
    await userEvent.click(await screen.findByTestId('live-consent'))
    await userEvent.click(screen.getByTestId('live-watch-video'))
    const player = screen.getByTestId('live-player')
    expect(within(player).getByText('Реконструкция с помощью ИИ')).toBeInTheDocument()
    const video = screen.getByTestId('live-video')
    expect(video).toHaveAttribute('src', '/live/reichstag.mp4')
    expect(video).toHaveAttribute('controls')
    expect(video.querySelector('track')).toHaveAttribute('src', '/live/reichstag.vtt')
    expect(screen.getByTestId('live-animation')).toHaveTextContent('кадр оживлён нейросетью')
  })

  it('камера узнала снимок — ролик играет поверх, потерялся — пауза', async () => {
    let options: ImageTrackingOptions | undefined
    const stop = vi.fn<() => void>()
    renderApp('/live/soldier', {
      signedIn: true,
      platform: {
        ar: {
          trackImage: async (o) => {
            options = o
            return { stop }
          },
        },
      },
    })
    await userEvent.click(await screen.findByTestId('live-consent'))
    await userEvent.click(screen.getByTestId('live-open-camera'))
    const status = await screen.findByTestId('live-ar-status')
    expect(await within(status).findByText(/Наведите камеру на снимок/)).toBeInTheDocument()
    expect(options).toMatchObject({ targetUrl: '/live/soldier.mind', aspect: 716 / 500 })
    expect(screen.getByTestId('live-ai-label')).toHaveTextContent('Реконструкция с помощью ИИ')

    act(() => options!.onFound())
    expect(status).toHaveTextContent('Снимок ожил')
    act(() => options!.onLost())
    expect(status).toHaveTextContent('Наведите камеру')

    await userEvent.click(screen.getByTestId('live-ar-close'))
    expect(screen.queryByTestId('live-ar')).not.toBeInTheDocument()
    expect(stop).toHaveBeenCalled()
  })

  it('камера недоступна — понятная ошибка и переход к ролику без камеры', async () => {
    renderApp('/live/soldier', { signedIn: true })
    await userEvent.click(await screen.findByTestId('live-consent'))
    await userEvent.click(screen.getByTestId('live-open-camera'))
    await userEvent.click(await screen.findByTestId('live-ar-fallback'))
    expect(screen.queryByTestId('live-ar')).not.toBeInTheDocument()
    expect(screen.getByTestId('live-video')).toHaveAttribute('controls')
  })

  it('список: оба снимка, ссылки на печать и переход из «Другого»', async () => {
    const { router } = renderApp('/live', { signedIn: true })
    expect(await screen.findByTestId('live-item-soldier')).toBeInTheDocument()
    expect(screen.getByTestId('live-item-reichstag')).toHaveTextContent('Скачать для печати')
    await router.navigate('/other?section=photo')
    expect(await screen.findByTestId('other-live')).toHaveAttribute('href', '/live')
  })

  it('неизвестный снимок — «не найден»', async () => {
    renderApp('/live/nobody', { signedIn: true })
    expect(await screen.findByTestId('live-not-found')).toBeInTheDocument()
  })

  it('без входа «Живое фото» ведёт на форму входа и помнит, куда вернуть', async () => {
    const { router } = renderApp('/live/soldier')
    expect(await screen.findByTestId('signin-submit')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/other')
    expect(router.state.location.search).toContain('next=%2Flive%2Fsoldier')
  })
})
