import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('скрытый демо-пульт', () => {
  it('подставить геопозицию', async () => {
    const { platform } = renderApp('/demo')
    const lat = await screen.findByTestId('demo-lat')
    await userEvent.clear(lat)
    await userEvent.type(lat, '53.28')
    await userEvent.clear(screen.getByTestId('demo-lon'))
    await userEvent.type(screen.getByTestId('demo-lon'), '36.57')
    await userEvent.click(screen.getByTestId('demo-geo-apply'))
    expect(await platform.geo.getPosition()).toEqual({ lat: 53.28, lon: 36.57 })
  })

  it('«вбросить» точку рядом — приходит уведомление с расстоянием', async () => {
    renderApp('/demo')
    await userEvent.click(await screen.findByTestId('demo-inject-site'))
    expect(await screen.findByTestId('toast')).toHaveTextContent(
      'В 5 км от вас обнаружено место гибели бойца. Требуется помощь в идентификации',
    )
  })

  it('сброс демо-данных — роль и прогресс забыты', async () => {
    const { platform } = renderApp('/demo', {
      role: 'family',
      stored: { 'quest:park-3km': { routeId: 'park-3km', donePointIds: ['rubezh'] } },
    })
    await userEvent.click(await screen.findByTestId('demo-reset'))
    expect(platform.storage.get('role')).toBeUndefined()
    expect(platform.storage.get('quest:park-3km')).toBeUndefined()
    expect(await screen.findByTestId('demo-reset-done')).toHaveTextContent('Данные сброшены')
  })

  it('версия сборки видна — чтобы на показе не открыть старую', async () => {
    renderApp('/demo')
    expect(await screen.findByTestId('demo-build')).toHaveTextContent(/Сборка: \S+/)
  })
})
