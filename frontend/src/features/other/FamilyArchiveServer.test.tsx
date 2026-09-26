import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiError, type AuthApi } from '../../api/client.ts'
import type { FamilyFighter } from '../../domain/familyArchive.ts'
import { renderApp } from '../../test/renderApp.tsx'

/** Вход через сервер: у аккаунта есть id — архив хранится в базе, у этого id. */
const auth: AuthApi = {
  me: async () => ({ id: 'USR-1', login: 'anna@example.com', since: '2026-09-25T09:00:00Z' }),
  login: async () => ({ id: 'USR-1', login: 'anna@example.com', since: '2026-09-25T09:00:00Z' }),
  register: async () => ({ id: 'USR-1', login: 'anna@example.com', since: '2026-09-25T09:00:00Z' }),
  logout: async () => undefined,
}

const IVANOV: FamilyFighter = {
  id: 'F-1',
  lastName: 'Иванов',
  firstName: 'Пётр',
  middleName: 'Сергеевич',
  birthYear: 1912,
  relation: 'прадед по маме',
  note: '',
  records: [
    { id: 'R-1', url: 'https://pamyat-naroda.ru/heroes/person-1/', title: 'Донесение о потерях' },
  ],
  createdAt: '2026-09-25T09:00:00Z',
}

describe('Семейный архив в аккаунте (сервер входа)', () => {
  it('бойцы из браузера переносятся в аккаунт вместе с записями, в браузере не остаются', async () => {
    const { api, platform } = renderApp('/other?section=archive', {
      signedIn: true,
      api: { auth },
      stored: { 'family:USR-1': [IVANOV] },
    })
    expect(await screen.findByTestId('family-moved')).toHaveTextContent('(1)')
    expect(screen.getByTestId('family-storage')).toHaveTextContent('в вашем аккаунте')
    const list = screen.getByTestId('family-list')
    expect(within(list).getByRole('link')).toHaveTextContent('Иванов Пётр Сергеевич')
    expect(within(list).getByRole('link')).toHaveTextContent('1 запись')

    const saved = await api.listFamilyFighters()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ lastName: 'Иванов', birthYear: 1912 })
    expect(saved[0]?.records.map((r) => r.title)).toEqual(['Донесение о потерях'])
    expect(platform.storage.get('family:USR-1')).toEqual([])
  })

  it('новый боец и запись сохраняются на сервере; повтор ссылки — ошибка у поля', async () => {
    const { api } = renderApp('/other?section=archive&fighter=new', {
      signedIn: true,
      api: { auth },
    })
    await userEvent.type(await screen.findByTestId('family-last-name'), 'Петров')
    await userEvent.click(screen.getByTestId('family-save'))
    expect(await screen.findByTestId('family-card-name')).toHaveTextContent('Петров')
    const [created] = await api.listFamilyFighters()
    expect(created?.lastName).toBe('Петров')

    const url = 'https://obd-memorial.ru/html/info.htm?id=1'
    await userEvent.type(screen.getByTestId('family-record-url'), url)
    await userEvent.click(screen.getByTestId('family-record-add'))
    expect(await screen.findByTestId('family-record-added')).toBeVisible()
    expect((await api.listFamilyFighters())[0]?.records.map((r) => r.url)).toEqual([url])

    await userEvent.type(screen.getByTestId('family-record-url'), url)
    await userEvent.click(screen.getByTestId('family-record-add'))
    expect(await screen.findByText('Эта запись уже добавлена')).toBeVisible()
  })

  it('удаление — на сервере, экран возвращается к списку', async () => {
    const { api, router } = renderApp('/other?section=archive', {
      signedIn: true,
      api: { auth },
      stored: { 'family:USR-1': [IVANOV] },
    })
    const link = within(await screen.findByTestId('family-list')).getByRole('link')
    await userEvent.click(link)
    await userEvent.click(await screen.findByTestId('family-remove'))
    await userEvent.click(screen.getByTestId('family-remove-confirm'))
    expect(await screen.findByTestId('family-empty')).toBeVisible()
    expect(router.state.location.search).toBe('?section=archive')
    expect(await api.listFamilyFighters()).toEqual([])
  })

  it('сессия истекла — просьба войти снова, без чужих данных', async () => {
    renderApp('/other?section=archive', {
      signedIn: true,
      api: {
        auth,
        listFamilyFighters: () => Promise.reject(new ApiError('Требуется вход', 401)),
      },
    })
    expect(await screen.findByTestId('family-signed-out')).toBeVisible()
    expect(screen.getByTestId('family-sign-in')).toHaveAttribute('href', '/other?section=account')
    expect(screen.queryByTestId('family-list')).not.toBeInTheDocument()
  })

  it('нет связи — сообщение и «Повторить»', async () => {
    let online = false
    renderApp('/other?section=archive', {
      signedIn: true,
      api: {
        auth,
        listFamilyFighters: async () => {
          if (!online) throw new ApiError('Нет связи с сервером', 0)
          return []
        },
      },
    })
    expect(await screen.findByTestId('family-error', {}, { timeout: 4000 })).toBeVisible()
    online = true
    await userEvent.click(screen.getByTestId('family-retry'))
    expect(await screen.findByTestId('family-empty')).toBeVisible()
  })
})
