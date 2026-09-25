import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

const toggle = () => screen.findByRole('button', { name: /Новости недели/ })
const body = () =>
  document.getElementById(
    screen.getByTestId('week-news-toggle').getAttribute('aria-controls') ?? '',
  ) as HTMLElement

describe('«Новости недели» сворачиваются', () => {
  it('по умолчанию свёрнуты: видны даты и число новостей, содержимое недоступно', async () => {
    renderApp('/events', { role: 'volunteer' })
    const button = await toggle()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveTextContent('Развернуть')
    expect(body()).toHaveAttribute('inert')
    const header = screen.getByTestId('week-news').querySelector('header') as HTMLElement
    expect(within(header).getByText(/\d+ новост/)).toBeInTheDocument()
  })

  it('нажатие раскрывает и запоминает выбор на устройстве', async () => {
    const { platform } = renderApp('/events', { role: 'volunteer' })
    const button = await toggle()
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveTextContent('Свернуть')
    expect(body()).not.toHaveAttribute('inert')
    expect(within(body()).getAllByText(/Отряд/).length).toBeGreaterThan(0)
    expect(platform.storage.get('events.weekNewsOpen')).toBe(true)
  })

  it('раскрытые при прошлом визите — раскрыты и сейчас; сворачиваются клавиатурой', async () => {
    renderApp('/events', { role: 'volunteer', stored: { 'events.weekNewsOpen': true } })
    const button = await toggle()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard(' ')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})
