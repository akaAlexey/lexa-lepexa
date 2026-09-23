import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

const POINT_1 = '/trail/park-3km/point/rubezh'

describe('карточка точки маршрута (user story 1)', () => {
  it('история, источник, шаг и задание для ребёнка', async () => {
    renderApp(POINT_1, { role: 'family' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Рубеж десантников' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('point-story')).toHaveTextContent('5-й воздушно-десантный корпус')
    expect(screen.getByTestId('point-sources')).toHaveTextContent('Десант в Орле')
    expect(screen.getByTestId('point-step')).toHaveTextContent('Точка 1 из 4')
    expect(screen.getByTestId('task-question')).toHaveTextContent('Сколько бригад')
    expect(within(screen.getByTestId('task')).getAllByRole('button')).toHaveLength(3)
  })

  it('неверный ответ — подсказка попробовать ещё раз, дальше не пускает', async () => {
    renderApp(POINT_1, { role: 'family' })
    await userEvent.click(await screen.findByTestId('task-option-0'))
    expect(screen.getByTestId('task-feedback')).toHaveTextContent('Попробуй ещё раз')
    expect(screen.queryByTestId('point-next')).not.toBeInTheDocument()
  })

  it('верный ответ — объяснение, точка засчитана, кнопка к следующей точке', async () => {
    const { platform, router } = renderApp(POINT_1, { role: 'family' })
    await userEvent.click(await screen.findByTestId('task-option-1'))
    expect(screen.getByTestId('task-feedback')).toHaveTextContent('Верно!')
    expect(screen.getByTestId('task-feedback')).toHaveTextContent('9-я, 10-я и 201-я')
    expect(platform.storage.get('quest:park-3km')).toEqual({
      routeId: 'park-3km',
      donePointIds: ['rubezh'],
    })
    await userEvent.click(screen.getByTestId('point-next'))
    expect(router.state.location.pathname).toBe('/trail/park-3km/point/okop')
  })

  it('последняя точка — «Завершить тропу» ведёт на финиш', async () => {
    const { router } = renderApp('/trail/park-3km/point/salut', {
      role: 'family',
      stored: {
        'quest:park-3km': { routeId: 'park-3km', donePointIds: ['rubezh', 'okop', 'shtab'] },
      },
    })
    await userEvent.click(await screen.findByTestId('task-option-1'))
    const finish = screen.getByTestId('point-next')
    expect(finish).toHaveTextContent('Завершить тропу')
    await userEvent.click(finish)
    expect(router.state.location.pathname).toBe('/trail/park-3km/finish')
    expect(await screen.findByTestId('finish-stamps')).toHaveTextContent('4 из 4')
  })

  it('несуществующая точка — понятное сообщение и путь назад', async () => {
    renderApp('/trail/park-3km/point/nope', { role: 'family' })
    expect(await screen.findByText(/Точка не найдена/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /К маршруту/ })).toHaveAttribute('href', '/trail')
  })
})

describe('экран «Тропа» с прогрессом', () => {
  it('«Начать тропу» ведёт к первой непройденной точке, прогресс виден', async () => {
    renderApp('/trail', {
      role: 'family',
      stored: { 'quest:park-3km': { routeId: 'park-3km', donePointIds: ['rubezh'] } },
    })
    expect(await screen.findByTestId('trail-progress')).toHaveTextContent('Пройдено 1 из 4')
    expect(screen.getByTestId('trail-start')).toHaveAttribute('href', '/trail/park-3km/point/okop')
    expect(screen.getByTestId('trail-start')).toHaveTextContent('Продолжить тропу')
  })
})
