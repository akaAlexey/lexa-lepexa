import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('карта «Последнего боя»', () => {
  it('захоронения по умолчанию скрыты — места гибели не теряются под фоновыми метками', async () => {
    renderApp('/last-battle', { role: 'volunteer' })
    const toggle = await screen.findByTestId('toggle-graves')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByTestId('battle-map').querySelectorAll('[data-testid^="marker-grave"]'),
    ).toHaveLength(0)
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveTextContent('Скрыть воинские захоронения')
    expect(
      screen.getByTestId('battle-map').querySelectorAll('[data-testid^="marker-grave"]').length,
    ).toBeGreaterThan(0)
  })

  it('в списке мест инициалы без двойной точки: «Иванов И.И. 1943.»', async () => {
    renderApp('/last-battle', { role: 'volunteer' })
    const card = await screen.findByTestId('site-S01')
    expect(within(card).getByText(/Иванов И\.И\. 1943\./)).toBeInTheDocument()
    expect(card.textContent).not.toMatch(/И\.И\.\./)
  })
})
