import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'
import { GENERATION_MS } from './generation.ts'

// В jsdom нет декодирования картинок: снимок остаётся исходным data URL

const photo = () => new File(['фото'], 'ded.jpg', { type: 'image/jpeg' })

describe('«Оживить своё фото»', () => {
  it('этическая оговорка и фраза из кейса выбрана по умолчанию', async () => {
    renderApp('/live/new', { role: 'family', signedIn: true })
    expect(await screen.findByTestId('live-new-ethics')).toHaveTextContent(
      'только для мемориальных целей',
    )
    expect(screen.getByTestId('live-new-text-case')).toBeChecked()
    expect(screen.getByText(/чтобы ты жил и видел голубое небо/)).toBeInTheDocument()
  })

  it('без фото и согласия не отправляется', async () => {
    renderApp('/live/new', { role: 'family', signedIn: true })
    await userEvent.click(await screen.findByTestId('live-new-submit'))
    expect(screen.getByTestId('live-new-photo-error')).toHaveTextContent('Выберите фотографию')
    expect(screen.getByTestId('live-new-consent-error')).toHaveTextContent('согласия')
    expect(screen.queryByTestId('live-new-sent')).not.toBeInTheDocument()
  })

  it('сверху — готовый пример ролика с пометкой ИИ', async () => {
    renderApp('/live/new', { role: 'family', signedIn: true })
    expect(await screen.findByTestId('live-new-ready')).toHaveAttribute('src', '/live/soldier.mp4')
    expect(screen.getAllByText(/Реконструкция с помощью ИИ/).length).toBeGreaterThan(0)
  })

  it('фото, согласие → этапы генерации → ролик с пометкой ИИ, «Мои живые фото» на устройстве', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { platform } = renderApp('/live/new', { role: 'family', signedIn: true })
    await user.upload(await screen.findByTestId('live-new-file'), photo())
    expect(await screen.findByTestId('live-new-preview')).toBeInTheDocument()
    await user.type(screen.getByTestId('live-new-name'), 'Красноармеец Петров П.П.')
    await user.click(screen.getByTestId('live-new-consent'))
    await user.click(screen.getByTestId('live-new-submit'))

    expect(await screen.findByTestId('live-gen-step')).toHaveTextContent('Загружаем снимок')
    await act(() => vi.advanceTimersByTimeAsync(4000))
    expect(screen.getByTestId('live-gen-step')).toHaveTextContent('Синтезируем речь')
    await act(() => vi.advanceTimersByTimeAsync(GENERATION_MS))

    const sent = await screen.findByTestId('live-new-sent')
    expect(sent).toHaveTextContent('сгенерированный заранее')
    expect(screen.getByTestId('live-new-speech')).toHaveTextContent(
      'Я сделал это, чтобы ты жил и видел голубое небо. Помни меня.',
    )
    expect(screen.getByTestId('live-new-example')).toHaveAttribute('src', '/live/reichstag.mp4')
    expect(screen.getByText(/Реконструкция с помощью ИИ/)).toBeInTheDocument()
    expect(screen.getByTestId('live-new-share')).toBeInTheDocument()
    const saved = platform.storage.get<{ name: string }[]>('live:mine')
    expect(saved?.[0]?.name).toBe('Красноармеец Петров П.П.')
    vi.useRealTimers()
  })

  it('тестовый снимок подставляет фото и подпись второго примера', async () => {
    renderApp('/live/new', { role: 'family', signedIn: true })
    await userEvent.click(await screen.findByTestId('live-new-test-photo'))
    expect(screen.getByTestId('live-new-preview')).toHaveAttribute('src', '/live/reichstag.jpg')
    expect(screen.getByTestId('live-new-name')).not.toHaveValue('')
  })

  it('рассказ о подвиге вместо фразы: короткий не принимается', async () => {
    renderApp('/live/new', { role: 'family', signedIn: true })
    await userEvent.click(await screen.findByTestId('live-new-text-feat'))
    await userEvent.type(screen.getByTestId('live-new-feat'), 'Коротко')
    await userEvent.click(screen.getByTestId('live-new-submit'))
    expect(screen.getByTestId('live-new-feat')).toHaveAttribute('aria-invalid', 'true')
  })

  it('из списка «живых фото» и с братской могилы на карте хроники — переход к своему фото', async () => {
    renderApp('/live', { role: 'family', signedIn: true })
    expect(await screen.findByTestId('live-own-link')).toHaveAttribute('href', '/live/new')
  })

  it('на карте хроники у братской могилы — «Создать живое фото»', async () => {
    renderApp('/chronicle', { role: 'family', signedIn: true })
    const map = await screen.findByTestId('chronicle-map')
    const graves = await within(map).findAllByRole('button', { name: /^Братская могила/ })
    await userEvent.click(graves[0]!)
    expect(screen.getByTestId('memorial-live-photo')).toHaveAttribute('href', '/live/new')
  })
})
