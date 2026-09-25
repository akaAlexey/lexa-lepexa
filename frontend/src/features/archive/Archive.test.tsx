import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('«Истории»: народный архив', () => {
  it('гость видит только проверенные истории и главную кнопку «Рассказать историю»', async () => {
    renderApp('/archive', { role: 'family' })
    const published = await screen.findByRole('list', { name: 'Проверенные истории' })
    expect(within(published).getByText('Памятник морякам-тихоокеанцам')).toBeInTheDocument()
    expect(screen.queryByTestId('story-ST02')).not.toBeInTheDocument()
    expect(screen.getByTestId('archive-new')).toHaveAttribute('href', '/archive/new')
  })

  it('семья рассказывает историю — она ждёт проверки и видна автору в «Моих историях»', async () => {
    const { router, platform } = renderApp('/archive/new', { role: 'family' })
    await userEvent.type(await screen.findByTestId('story-title'), 'Письмо прадеда')
    await userEvent.type(screen.getByTestId('story-place'), 'Кромы')
    await userEvent.type(
      screen.getByTestId('story-body'),
      'Прадед писал домой летом 1943 года, перед наступлением на Орёл.',
    )
    await userEvent.type(screen.getByTestId('story-author'), 'Семья Ивановых')
    await userEvent.click(screen.getByTestId('story-send'))

    expect(await screen.findByTestId('story-sent')).toBeInTheDocument()
    expect(screen.getByTestId('story-status')).toHaveTextContent('Ожидает проверки')
    expect(router.state.location.pathname).toMatch(/^\/archive\/ST-/)
    expect(platform.storage.get<string[]>('archive:mine')).toHaveLength(1)

    await router.navigate('/archive')
    const mine = await screen.findByRole('list', { name: 'Мои истории' })
    expect(within(mine).getByText('Письмо прадеда')).toBeInTheDocument()
  })

  it('короткая история не отправляется — ошибки у полей', async () => {
    const { router } = renderApp('/archive/new', { role: 'family' })
    await userEvent.type(await screen.findByTestId('story-body'), 'Коротко')
    await userEvent.click(screen.getByTestId('story-send'))
    expect(await screen.findByText(/не короче 30 символов/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/archive/new')
  })

  it('краевед: очередь проверки, без всех пунктов чек-листа подтвердить нельзя', async () => {
    const { api } = renderApp('/archive', { role: 'verifier' })
    const next = await screen.findByTestId('archive-review-next')
    const awaiting = (await api.listStories()).filter(
      (x) => x.status === 'pending' || x.status === 'clarify',
    ).length
    expect(next).toHaveTextContent(`Проверить истории · ${awaiting}`)
    await userEvent.click(next)

    await userEvent.click(await screen.findByTestId('review-verify'))
    expect(await screen.findByTestId('review-blocker')).toHaveTextContent('Отметьте все пункты')

    for (const id of ['datePlace', 'source', 'archive'])
      await userEvent.click(screen.getByTestId(`review-check-${id}`))
    await userEvent.click(screen.getByTestId('review-verify'))
    expect(await screen.findByTestId('story-status')).toHaveTextContent('Подтверждено')
    expect(screen.queryByTestId('review-verify')).not.toBeInTheDocument()
  })

  it('без источника краевед просит уточнение — комментарий обязателен и виден автору', async () => {
    renderApp('/archive/ST03', { role: 'verifier' })
    await userEvent.click(await screen.findByTestId('review-clarify'))
    expect(await screen.findByTestId('review-blocker')).toHaveTextContent('что нужно уточнить')
    await userEvent.type(screen.getByTestId('review-note'), 'Нужен номер полевой почты')
    await userEvent.click(screen.getByTestId('review-clarify'))
    expect(await screen.findByTestId('review-saved')).toBeInTheDocument()
    expect(screen.getByTestId('story-review-note')).toHaveTextContent('Нужен номер полевой почты')
  })

  it('волонтёр историю не проверяет', async () => {
    renderApp('/archive/ST02', { role: 'volunteer' })
    expect(await screen.findByTestId('story-status')).toHaveTextContent('Ожидает проверки')
    expect(screen.queryByTestId('review-verify')).not.toBeInTheDocument()
  })
})
