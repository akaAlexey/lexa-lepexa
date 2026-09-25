import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client.ts'
import { renderApp } from '../../test/renderApp.tsx'

const ADULT = { 'profile.age': { adultVerified: true, age: 25 } }

async function openRequestSignup(stored: Record<string, unknown> = {}) {
  const app = renderApp('/events', { role: 'volunteer', stored })
  const card = await screen.findByTestId('request-card-R01')
  await userEvent.click(within(card).getByTestId('request-join-R01'))
  const dialog = await screen.findByTestId('signup-dialog')
  return { ...app, card, dialog }
}

async function fillParent() {
  await userEvent.type(screen.getByTestId('signup-fullName'), 'Иванова Мария Петровна')
  await userEvent.type(screen.getByTestId('signup-phone'), '8 900 123-45-67')
  await userEvent.click(screen.getByTestId('signup-agreed'))
}

describe('окно записи на заявку отряда', () => {
  it('сначала условия: дата, начало и конец, место сбора, что взять, возраст', async () => {
    const { dialog } = await openRequestSignup()
    expect(dialog).toHaveAccessibleName('Запись: Вахта Памяти (Орловская обл.)')
    const terms = within(dialog).getByTestId('signup-terms')
    expect(terms).toHaveTextContent('3 октября, суббота')
    expect(within(terms).getByTestId('signup-starts')).toHaveTextContent('09:00')
    expect(within(terms).getByTestId('signup-ends')).toHaveTextContent('18:00')
    expect(terms).toHaveTextContent('Мценск, площадь у автостанции')
    expect(terms).toHaveTextContent('от 16 лет')
    expect(within(terms).getByText('Рабочие перчатки')).toBeInTheDocument()
  })

  it('возраст 18+ не подтверждён — без согласия родителя запись не уходит', async () => {
    const { api, dialog } = await openRequestSignup()
    expect(within(dialog).getByTestId('signup-consent')).toHaveTextContent('Согласие родителя')
    const before = (await api.listRequests()).find((r) => r.id === 'R01')?.joined
    await userEvent.click(within(dialog).getByTestId('signup-confirm'))
    expect(screen.getByTestId('signup-fullName')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('signup-fullName')).toHaveFocus()
    expect(screen.getByTestId('signup-phone')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('signup-agreed')).toHaveAttribute('aria-invalid', 'true')
    expect((await api.listRequests()).find((r) => r.id === 'R01')?.joined).toBe(before)
  })

  it('с согласием родителя запись проходит, карточка показывает «Вы записаны»', async () => {
    const { platform, dialog } = await openRequestSignup()
    await fillParent()
    await userEvent.click(within(dialog).getByTestId('signup-confirm'))
    expect(await screen.findByTestId('signup-done')).toHaveTextContent(
      'Вы записаны. 3 октября, суббота, сбор в 09:00 — Мценск, площадь у автостанции.',
    )
    await userEvent.click(within(dialog).getByTestId('dialog-close'))
    expect(screen.getByTestId('request-joined-R01')).toHaveTextContent('Вы записаны')
    expect(platform.storage.get('search.joinedRequests')).toEqual(['R01'])
    // данные родителя уходят только в запрос — на устройстве их нет
    expect(JSON.stringify(localStorage)).not.toContain('Иванова')
  })

  it('подтверждённые в профиле 18+ — согласие не спрашиваем', async () => {
    const { dialog } = await openRequestSignup(ADULT)
    expect(within(dialog).queryByTestId('signup-consent')).not.toBeInTheDocument()
    expect(within(dialog).getByTestId('signup-adult')).toHaveTextContent('18+ подтверждён')
    await userEvent.click(within(dialog).getByTestId('signup-confirm'))
    expect(await screen.findByTestId('signup-done')).toBeInTheDocument()
  })

  it('возраст из профиля младше минимального — записаться нельзя, объясняем почему', async () => {
    const { dialog } = await openRequestSignup({ 'profile.age': { adultVerified: false, age: 15 } })
    expect(within(dialog).getByTestId('signup-too-young')).toHaveTextContent(
      'Участвовать можно с 16 лет',
    )
    expect(within(dialog).queryByTestId('signup-confirm')).not.toBeInTheDocument()
  })

  it('ошибка сервера — понятный текст, окно открыто, введённое не потеряно', async () => {
    const { api, dialog } = await openRequestSignup()
    vi.spyOn(api, 'joinRequest').mockRejectedValue(new ApiError('Нет связи с сервером', 0))
    await fillParent()
    await userEvent.click(within(dialog).getByTestId('signup-confirm'))
    expect(await screen.findByTestId('signup-error')).toHaveTextContent('Нет связи с сервером')
    expect(screen.getByTestId('signup-fullName')).toHaveValue('Иванова Мария Петровна')
    expect(screen.queryByTestId('request-joined-R01')).not.toBeInTheDocument()
  })

  it('Escape закрывает окно и возвращает фокус на «Записаться»', async () => {
    await openRequestSignup()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('signup-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('request-join-R01')).toHaveFocus()
  })

  it('командир набирает людей и не записывается', async () => {
    renderApp('/events', { role: 'commander' })
    const card = await screen.findByTestId('request-card-R01')
    expect(within(card).queryByTestId('request-join-R01')).not.toBeInTheDocument()
  })
})

describe('окно записи на выезд', () => {
  it('«Записаться на выезд» открывает условия, после записи — минус место и «Вы записаны»', async () => {
    renderApp('/weekends/W01', { role: 'volunteer', stored: ADULT })
    expect(await screen.findByTestId('trip-time')).toHaveTextContent('10:00–17:00 по Москве')
    expect(screen.getByTestId('trip-spots')).toHaveTextContent('Свободно мест: 7 из 12')
    await userEvent.click(screen.getByTestId('trip-register'))
    const dialog = await screen.findByTestId('signup-dialog')
    expect(within(dialog).getByTestId('signup-terms')).toHaveTextContent('Щуп')
    await userEvent.click(within(dialog).getByTestId('signup-confirm'))
    expect(await screen.findByTestId('signup-done')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByTestId('dialog-close'))
    expect(screen.getByTestId('trip-spots')).toHaveTextContent('Свободно мест: 6 из 12')
    expect(screen.getByTestId('trip-register')).toBeDisabled()
    expect(screen.getByTestId('trip-registered')).toHaveTextContent('сбор в 10:00')
  })

  it('запись на выезд помнится после перезагрузки и видна в ленте', async () => {
    renderApp('/events?show=trip', { role: 'volunteer', stored: { 'trips.registered': ['W01'] } })
    expect(await screen.findByTestId('feed-trip-registered-W01')).toHaveTextContent('Вы записаны')
  })

  it('на выезд без мест кнопка неактивна, окно не открывается', async () => {
    const { api, router } = renderApp('/events', { role: 'volunteer', stored: ADULT })
    const body = { termsAccepted: true, adultVerified: true } as const
    for (let i = 0; i < 7; i++) await api.registerTrip({ id: 'W02', body })
    await router.navigate('/weekends/W02')
    expect(await screen.findByTestId('trip-full')).toBeInTheDocument()
    expect(screen.getByTestId('trip-register')).toBeDisabled()
  })
})
