import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

const url = '/payment/checkout?fundraiser=F03&amount=500'
const text = (id: string) => screen.getByTestId(id).textContent?.replace(/\s/g, ' ')

describe('касса учебной оплаты условными токенами', () => {
  it('оплата списывает токены, сумма уходит в сбор на сервере, чек с номером', async () => {
    const { api, platform } = renderApp(url, { role: 'volunteer' })
    const before = (await api.listFundraisers()).find((f) => f.id === 'F03')!.collectedRub
    expect(await screen.findByTestId('checkout-amount')).toHaveTextContent('500')
    expect(text('checkout-balance')).toBe('10 000 токенов')
    await userEvent.click(screen.getByTestId('checkout-pay'))
    expect(await screen.findByTestId('checkout-receipt')).toHaveTextContent('Чек №')
    expect(screen.getByTestId('checkout-note')).toHaveTextContent('Реальные деньги не списывались')
    expect(text('checkout-balance-after')).toContain('в кошельке 9 500 токенов')
    expect(platform.storage.get('wallet.tokens')).toBe(9500)
    const after = (await api.listFundraisers()).find((f) => f.id === 'F03')!.collectedRub
    expect(after).toBe(before + 500)
  })

  it('не хватает токенов — оплата закрыта, можно пополнить кошелёк', async () => {
    renderApp(url, { role: 'volunteer', stored: { 'wallet.tokens': 200 } })
    expect(await screen.findByTestId('checkout-short')).toHaveTextContent('Не хватает токенов')
    expect(screen.getByTestId('checkout-pay')).toBeDisabled()
    await userEvent.click(screen.getByTestId('checkout-top-up'))
    expect(text('checkout-balance')).toBe('5 200 токенов')
    expect(screen.getByTestId('checkout-pay')).toBeEnabled()
  })

  it('сервер не ответил — токены не списаны', async () => {
    renderApp(url, {
      role: 'volunteer',
      api: { donate: () => Promise.reject(new Error('offline')) },
    })
    await userEvent.click(await screen.findByTestId('checkout-pay'))
    expect(await screen.findByTestId('checkout-error')).toHaveTextContent('токены не списаны')
    expect(text('checkout-balance')).toBe('10 000 токенов')
  })

  it('неизвестный сбор — понятное сообщение и путь к сборам', async () => {
    renderApp('/payment/checkout?fundraiser=NOPE&amount=500')
    expect(await screen.findByTestId('checkout-invalid')).toBeVisible()
    expect(screen.getByTestId('checkout-to-fundraisers')).toHaveAttribute(
      'href',
      '/events?show=fund',
    )
  })
})
