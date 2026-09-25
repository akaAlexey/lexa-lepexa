import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

const toggle = () => screen.findByRole('button', { name: /Новости недели/ })
const body = () =>
  document.getElementById(
    screen.getByTestId('week-news-toggle').getAttribute('aria-controls') ?? '',
  )

describe('«Новости недели» сворачиваются', () => {
  it('по умолчанию раскрыты: кнопка сообщает состояние и связана с содержимым', async () => {
    renderApp('/events', { role: 'volunteer' })
    const button = await toggle()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveTextContent('Свернуть')
    expect(body()).toBeVisible()
    expect(within(body()!).getAllByText(/Высота|Поиск|Отряд/).length).toBeGreaterThan(0)
  })

  it('нажатие сворачивает и запоминает выбор на устройстве', async () => {
    const { platform } = renderApp('/events', { role: 'volunteer' })
    const button = await toggle()
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveTextContent('Развернуть')
    expect(body()).not.toBeVisible()
    expect(platform.storage.get('events.weekNewsOpen')).toBe(false)
  })

  it('свёрнутые при прошлом визите — свёрнуты и сейчас; раскрываются клавиатурой', async () => {
    renderApp('/events', { role: 'volunteer', stored: { 'events.weekNewsOpen': false } })
    const button = await toggle()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard(' ')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('пометка «Демо-данные» — у заголовка и видна в свёрнутом виде', async () => {
    renderApp('/events', { role: 'volunteer', stored: { 'events.weekNewsOpen': false } })
    await toggle()
    const card = screen.getByTestId('week-news')
    expect(within(card).getByText('Демо-данные')).toBeVisible()
  })
})
