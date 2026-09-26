import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { FamilyFighter } from '../../domain/familyArchive.ts'
import { renderApp } from '../../test/renderApp.tsx'

/** Ключ архива при `signedIn: true`: у старого входа нет id — владелец по скрытому логину. */
const KEY = 'family:+7 ··· ···-45-67'

const IVANOV: FamilyFighter = {
  id: 'F-1',
  lastName: 'Иванов',
  firstName: 'Пётр',
  middleName: 'Сергеевич',
  birthYear: 1912,
  relation: 'прадед по маме',
  note: 'Ушёл на фронт в 1941.\nПисал письма из-под Орла.',
  records: [
    { id: 'R-1', url: 'https://pamyat-naroda.ru/heroes/person-1/', title: 'Донесение о потерях' },
  ],
  createdAt: '2026-09-25T09:00:00Z',
}

const archive = (fighters: FamilyFighter[] = [IVANOV]) => ({ stored: { [KEY]: fighters } })

const mainActions = () => document.querySelectorAll('[data-main-action]')

describe('Семейный архив', () => {
  it('пустой архив: одна главная кнопка, «Рассказать историю» ведёт на форму истории', async () => {
    const { router } = renderApp('/other?section=archive', { signedIn: true })
    expect(await screen.findByTestId('family-add')).toHaveTextContent('Добавить бойца')
    expect(mainActions()).toHaveLength(1)
    expect(screen.getByTestId('family-empty')).toBeVisible()
    expect(screen.getByText(/хранится только в этом браузере/)).toBeVisible()
    expect(screen.getByTestId('other-family-story')).toHaveAttribute('href', '/archive/new')
    await userEvent.click(screen.getByTestId('other-family-story'))
    expect(router.state.location.pathname).toBe('/archive/new')
  })

  it('добавление: ошибки по полям, затем карточка по своему адресу', async () => {
    const { router, platform } = renderApp('/other?section=archive', { signedIn: true })
    await userEvent.click(await screen.findByTestId('family-add'))
    expect(router.state.location.search).toBe('?section=archive&fighter=new')
    expect(mainActions()).toHaveLength(1)
    expect(screen.getByTestId('other-back')).toHaveTextContent('К семейному архиву')
    expect(screen.getByTestId('other-back')).toHaveAttribute('href', '/other?section=archive')

    await userEvent.type(screen.getByTestId('family-first-name'), 'Пётр1')
    await userEvent.type(screen.getByTestId('family-birth-year'), '1950')
    await userEvent.click(screen.getByTestId('family-save'))
    expect(screen.getByTestId('family-last-name')).toHaveAccessibleDescription(/Укажите фамилию/)
    expect(screen.getByTestId('family-first-name')).toHaveAccessibleDescription(/Только буквы/)
    expect(screen.getByTestId('family-birth-year')).toHaveAccessibleDescription(/от 1860 до 1935/)
    expect(platform.storage.get(KEY)).toBeUndefined()

    await userEvent.type(screen.getByTestId('family-last-name'), '  Иванов ')
    await userEvent.clear(screen.getByTestId('family-first-name'))
    await userEvent.type(screen.getByTestId('family-first-name'), 'Пётр')
    await userEvent.type(screen.getByTestId('family-middle-name'), 'Сергеевич')
    await userEvent.clear(screen.getByTestId('family-birth-year'))
    await userEvent.type(screen.getByTestId('family-birth-year'), '1912')
    await userEvent.type(screen.getByTestId('family-relation'), 'прадед  по маме')
    await userEvent.click(screen.getByTestId('family-save'))

    const saved = platform.storage.get<FamilyFighter[]>(KEY)!
    expect(saved).toHaveLength(1)
    expect(saved[0]!.id).toMatch(/^F-/)
    expect(saved[0]).toMatchObject({ lastName: 'Иванов', relation: 'прадед по маме' })
    expect(router.state.location.search).toBe(`?section=archive&fighter=${saved[0]!.id}`)
    expect(await screen.findByTestId('family-card-name')).toHaveTextContent('Иванов Пётр Сергеевич')
    expect(screen.getByText('прадед по маме · 1912 г. р.')).toBeVisible()

    // сохранение заменило форму в истории: «Назад» браузера не возвращает к пустой форме
    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?section=archive')
    expect(screen.getByTestId(`family-fighter-${saved[0]!.id}`)).toHaveTextContent(
      'прадед по маме · 1912 г. р. · 0 записей',
    )
  })

  it('карточка открывается по адресу: имя, заметка, записи, одна главная кнопка', async () => {
    renderApp('/other?section=archive&fighter=F-1', { signedIn: true, ...archive() })
    expect(await screen.findByTestId('family-card-name')).toHaveTextContent('Иванов Пётр Сергеевич')
    expect(screen.getByTestId('family-card-note')).toHaveTextContent('Писал письма из-под Орла.')
    expect(screen.getByTestId('family-story')).toHaveAttribute('href', '/archive/new')
    expect(mainActions()).toHaveLength(1)
    expect(screen.getByTestId('other-back')).toHaveAttribute('href', '/other?section=archive')
  })

  it('поиск: ссылки с ФИО и годом открываются в новой вкладке', async () => {
    renderApp('/other?section=archive&fighter=F-1', { signedIn: true, ...archive() })
    const pamyat = await screen.findByTestId('family-search-pamyat')
    const obd = screen.getByTestId('family-search-obd')
    for (const link of [pamyat, obd]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(link).toHaveTextContent('(откроется в новой вкладке)')
    }
    const p = new URL(pamyat.getAttribute('href')!)
    expect(p.hostname).toBe('pamyat-naroda.ru')
    expect(p.searchParams.get('last_name')).toBe('Иванов')
    expect(p.searchParams.get('middle_name')).toBe('Сергеевич')
    expect(p.searchParams.get('date_birth_from')).toBe('1912')
    const o = new URL(obd.getAttribute('href')!)
    expect(o.hostname).toBe('obd-memorial.ru')
    expect(o.searchParams.get('f')).toBe('P~Иванов')
    expect(o.searchParams.get('bd')).toBe('P~1912')
  })

  it('записи: чужие ссылки и дубли отклоняются, подпись по умолчанию — название базы', async () => {
    const { platform } = renderApp('/other?section=archive&fighter=F-1', {
      signedIn: true,
      ...archive(),
    })
    const url = await screen.findByTestId('family-record-url')
    const add = () => userEvent.click(screen.getByTestId('family-record-add'))

    await userEvent.type(url, 'https://pamyat-naroda.ru.evil.com/x')
    await add()
    expect(url).toHaveAccessibleDescription(/Нужна ссылка на «Память народа»/)
    expect(screen.queryByTestId('family-record-added')).not.toBeInTheDocument()

    await userEvent.clear(url)
    await userEvent.type(url, 'https://pamyat-naroda.ru/heroes/person-1/')
    await add()
    expect(url).toHaveAccessibleDescription(/уже добавлена/)

    await userEvent.clear(url)
    await userEvent.type(url, 'https://obd-memorial.ru/html/info.htm?id=77')
    await add()
    expect(screen.getByTestId('family-record-added')).toHaveTextContent('Запись добавлена')
    expect(url).toHaveValue('')
    const records = screen.getByTestId('family-records')
    const link = within(records).getByRole('link', { name: /ОБД «Мемориал»/ })
    expect(link).toHaveAttribute('href', 'https://obd-memorial.ru/html/info.htm?id=77')
    expect(link).toHaveAttribute('target', '_blank')
    expect(platform.storage.get<FamilyFighter[]>(KEY)![0]!.records).toHaveLength(2)

    await userEvent.click(screen.getByTestId('family-record-remove-R-1'))
    expect(within(records).queryByText('Донесение о потерях')).not.toBeInTheDocument()
    expect(platform.storage.get<FamilyFighter[]>(KEY)![0]!.records).toHaveLength(1)
  })

  it('правка сохраняет найденные записи и дату создания', async () => {
    const { platform, router } = renderApp('/other?section=archive&fighter=F-1', {
      signedIn: true,
      ...archive(),
    })
    await userEvent.click(await screen.findByTestId('family-edit'))
    expect(router.state.location.search).toBe('?section=archive&fighter=F-1&edit=1')
    expect(screen.getByTestId('family-last-name')).toHaveValue('Иванов')
    expect(screen.getByTestId('family-birth-year')).toHaveValue('1912')
    await userEvent.clear(screen.getByTestId('family-first-name'))
    await userEvent.type(screen.getByTestId('family-first-name'), 'Павел')
    await userEvent.click(screen.getByTestId('family-save'))

    expect(router.state.location.search).toBe('?section=archive&fighter=F-1')
    expect(await screen.findByTestId('family-card-name')).toHaveTextContent(
      'Иванов Павел Сергеевич',
    )
    expect(platform.storage.get(KEY)).toEqual([{ ...IVANOV, firstName: 'Павел' }])
    expect(screen.getByText('Донесение о потерях')).toBeVisible()
  })

  it('удаление — только после подтверждения', async () => {
    const { platform, router } = renderApp('/other?section=archive&fighter=F-1', {
      signedIn: true,
      ...archive(),
    })
    await userEvent.click(await screen.findByTestId('family-remove'))
    expect(screen.getByText(/Удалить «Иванов Пётр Сергеевич»/)).toBeVisible()
    await userEvent.click(screen.getByTestId('family-remove-cancel'))
    expect(platform.storage.get(KEY)).toEqual([IVANOV])
    expect(screen.queryByTestId('family-remove-confirm')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('family-remove'))
    await userEvent.click(screen.getByTestId('family-remove-confirm'))
    // удаление и уход к списку — одним обновлением: «бойца нет в архиве» не показывается
    expect(await screen.findByTestId('family-empty')).toBeVisible()
    expect(screen.queryByTestId('family-missing')).not.toBeInTheDocument()
    expect(platform.storage.get(KEY)).toEqual([])
    expect(router.state.location.search).toBe('?section=archive')
  })

  it('неизвестный боец: сообщение и путь к списку', async () => {
    renderApp('/other?section=archive&fighter=F-404', { signedIn: true, ...archive() })
    expect(await screen.findByTestId('family-missing')).toBeVisible()
    expect(screen.getByTestId('family-to-list')).toHaveAttribute('href', '/other?section=archive')
    expect(mainActions()).toHaveLength(1)
  })

  it('чужой архив на этом устройстве не виден, испорченные записи отброшены', async () => {
    renderApp('/other?section=archive', {
      signedIn: true,
      stored: {
        'family:someone@example.com': [IVANOV],
        [KEY]: [
          { id: 'F-2' },
          {
            ...IVANOV,
            id: 'F-3',
            lastName: 'Петров',
            records: [{ id: 'R-9', url: 'javascript:alert(1)', title: 'x' }],
          },
        ],
      },
    })
    const list = await screen.findByTestId('family-list')
    expect(within(list).getAllByRole('link')).toHaveLength(1)
    expect(screen.getByTestId('family-fighter-F-3')).toHaveTextContent('Петров Пётр Сергеевич')
    expect(screen.getByTestId('family-fighter-F-3')).toHaveTextContent('0 записей')
    expect(screen.queryByText(/^Иванов/)).not.toBeInTheDocument()
  })
})
