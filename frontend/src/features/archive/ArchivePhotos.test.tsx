import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('архивные фото к истории', () => {
  it('снимок с подписью, ссылкой на источник и лицензией; открывается крупно', async () => {
    renderApp('/archive/ST19', { role: 'family' })
    const section = await screen.findByTestId('archive-photos')
    const img = within(section).getByRole('img', { name: /Болхов, 29 июля 1943/ })
    expect(img.getAttribute('src')).toMatch(/archive-photos\/bolkhov-1943\.jpg$/)
    const source = within(section).getByRole('link', { name: 'Источник' })
    expect(source).toHaveAttribute('href', expect.stringContaining('commons.wikimedia.org'))
    expect(section).toHaveTextContent('Общественное достояние')
    await userEvent.click(within(section).getByTestId('archive-photo-0'))
    expect(screen.getByTestId('archive-photo-view')).toBeInTheDocument()
  })

  it('у истории без снимков блока нет', async () => {
    renderApp('/archive/ST01', { role: 'family' })
    await screen.findByTestId('story-source-text')
    expect(screen.queryByTestId('archive-photos')).not.toBeInTheDocument()
  })
})
