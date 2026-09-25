import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../api/index.ts'
import { renderApp } from '../test/renderApp.tsx'

type Status = Awaited<ReturnType<ApiClient['paymentStatus']>>

const PENDING = { 'payment:pending': { id: 'pay-1', fundraiserId: 'F01', amountRub: 500 } }
const FUND = {
  id: 'F01',
  teamId: 'T01',
  purpose: 'fuel' as const,
  title: 'Бензин на Вахту Памяти',
  goalRub: 15000,
  collectedRub: 9500,
  demo: true,
}
const state = (status: Status['status'], extra: Partial<Status> = {}): Status => ({
  paymentId: 'pay-1',
  status,
  amountRub: 500,
  ...extra,
})

afterEach(() => vi.useRealTimers())

describe('страница результата оплаты ЮKassa (/payment)', () => {
  it('succeeded — «Тестовый платёж прошёл», сумма сбора из ответа, платёж забыт', async () => {
    const paymentStatus = vi.fn<ApiClient['paymentStatus']>(async () =>
      state('succeeded', { fundraiser: FUND }),
    )
    const { platform } = renderApp('/payment', { stored: PENDING, api: { paymentStatus } })
    expect(await screen.findByTestId('payment-succeeded')).toHaveTextContent(
      'Спасибо! Тестовый платёж прошёл',
    )
    expect(screen.getByTestId('payment-fundraiser')).toHaveTextContent(
      'собрано 9 500 ₽ из 15 000 ₽',
    )
    expect(paymentStatus).toHaveBeenCalledWith({ id: 'pay-1' })
    expect(platform.storage.get('payment:pending')).toBeUndefined()
    // одна главная кнопка
    expect(document.querySelectorAll('[data-main-action]')).toHaveLength(1)
  })

  it('canceled — «Платёж отменён», текстом, а не только цветом', async () => {
    renderApp('/payment', {
      stored: PENDING,
      api: { paymentStatus: async () => state('canceled') },
    })
    expect(await screen.findByTestId('payment-canceled')).toHaveTextContent('Платёж отменён')
  })

  it('пока ЮKassa не подтвердила — «Проверяем оплату…» и повторный опрос', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const paymentStatus = vi
      .fn<ApiClient['paymentStatus']>()
      .mockResolvedValueOnce(state('pending'))
      .mockResolvedValueOnce(state('succeeded'))
    renderApp('/payment', { stored: PENDING, api: { paymentStatus } })
    expect(await screen.findByTestId('payment-checking')).toHaveTextContent('Проверяем оплату…')
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByTestId('payment-succeeded')).toBeInTheDocument()
    expect(paymentStatus).toHaveBeenCalledTimes(2)
  })

  it('сервер не ответил — понятное сообщение и «Проверить ещё раз»', async () => {
    const paymentStatus = vi
      .fn<ApiClient['paymentStatus']>()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(state('succeeded'))
    renderApp('/payment', { stored: PENDING, api: { paymentStatus } })
    expect(await screen.findByTestId('payment-error')).toHaveTextContent('не отвечают')
    await userEvent.click(screen.getByTestId('payment-retry'))
    expect(await screen.findByTestId('payment-succeeded')).toBeInTheDocument()
  })

  it('без ожидающего платежа — ничего не запрашивает и ведёт к сборам', async () => {
    const paymentStatus = vi.fn<ApiClient['paymentStatus']>()
    renderApp('/payment', { api: { paymentStatus } })
    expect(await screen.findByTestId('payment-none')).toBeInTheDocument()
    expect(screen.getByTestId('payment-to-fundraisers')).toHaveAttribute(
      'href',
      '/events?show=fund',
    )
    expect(paymentStatus).not.toHaveBeenCalled()
  })
})
