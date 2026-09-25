import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

// В jsdom нет декодирования картинок: снимок остаётся исходным data URL

const photo = () => new File(['фото'], 'ded.jpg', { type: 'image/jpeg' })

describe('«Оживить своё фото»', () => {
  it('этическая оговорка и фраза из кейса выбрана по умолчанию', async () => {
    renderApp('/live/new', { role: 'family' })
    expect(await screen.findByTestId('live-new-ethics')).toHaveTextContent(
      'только для мемориальных целей',
    )
    expect(screen.getByTestId('live-new-text-case')).toBeChecked()
    expect(screen.getByText(/чтобы ты жил и видел голубое небо/)).toBeInTheDocument()
  })

  it('без фото и согласия не отправляется', async () => {
    renderApp('/live/new', { role: 'family' })
    await userEvent.click(await screen.findByTestId('live-new-submit'))
    expect(screen.getByTestId('live-new-photo-error')).toHaveTextContent('Выберите фотографию')
    expect(screen.getByTestId('live-new-consent-error')).toHaveTextContent('согласия')
    expect(screen.queryByTestId('live-new-sent')).not.toBeInTheDocument()
  })

  it('фото, согласие → принято: речь из кейса, пример ролика с пометкой ИИ, «Мои живые фото» на устройстве', async () => {
    const { platform } = renderApp('/live/new', { role: 'family' })
    await userEvent.upload(await screen.findByTestId('live-new-file'), photo())
    expect(await screen.findByTestId('live-new-preview')).toBeInTheDocument()
    await userEvent.type(screen.getByTestId('live-new-name'), 'Красноармеец Петров П.П.')
    await userEvent.click(screen.getByTestId('live-new-consent'))
    await userEvent.click(screen.getByTestId('live-new-submit'))

    const sent = await screen.findByTestId('live-new-sent')
    expect(sent).toHaveTextContent('в демо не создаётся')
    expect(sent).toHaveTextContent('подготовила заранее')
    expect(screen.getByTestId('live-new-speech')).toHaveTextContent(
      'Я сделал это, чтобы ты жил и видел голубое небо. Помни меня.',
    )
    expect(await screen.findByTestId('live-new-example')).toBeInTheDocument()
    expect(screen.getByText(/Реконструкция с помощью ИИ/)).toBeInTheDocument()
    expect(screen.getByTestId('live-new-share')).toBeInTheDocument()
    const saved = platform.storage.get<{ name: string }[]>('live:mine')
    expect(saved?.[0]?.name).toBe('Красноармеец Петров П.П.')
  })

  it('рассказ о подвиге вместо фразы: короткий не принимается', async () => {
    renderApp('/live/new', { role: 'family' })
    await userEvent.click(await screen.findByTestId('live-new-text-feat'))
    await userEvent.type(screen.getByTestId('live-new-feat'), 'Коротко')
    await userEvent.click(screen.getByTestId('live-new-submit'))
    expect(screen.getByTestId('live-new-feat')).toHaveAttribute('aria-invalid', 'true')
  })

  it('из списка «живых фото» и с братской могилы на карте хроники — переход к своему фото', async () => {
    renderApp('/live', { role: 'family' })
    expect(await screen.findByTestId('live-own-link')).toHaveAttribute('href', '/live/new')
  })

  it('на карте хроники у братской могилы — «Создать живое фото»', async () => {
    renderApp('/chronicle', { role: 'family' })
    const map = await screen.findByTestId('chronicle-map')
    const graves = await within(map).findAllByRole('button', { name: /^Братская могила/ })
    await userEvent.click(graves[0]!)
    expect(screen.getByTestId('memorial-live-photo')).toHaveAttribute('href', '/live/new')
  })
})
