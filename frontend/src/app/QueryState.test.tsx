import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Loadable } from '../functions/core/query.ts'
import { QueryState } from './QueryState.tsx'

function state(values: Partial<Loadable<string>>): Loadable<string> {
  return values as Loadable<string>
}

describe('состояния загрузки экрана', () => {
  it('объявляет загрузку, не показывая прежние данные', () => {
    render(
      <QueryState query={state({ isPending: true })} what="истории">
        {() => <p>Старая история</p>}
      </QueryState>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Загружаем истории')
    expect(screen.queryByText('Старая история')).not.toBeInTheDocument()
  })

  it('объявляет ошибку и позволяет повторить запрос', async () => {
    const refetch = vi.fn<() => Promise<never>>()
    render(
      <QueryState query={state({ isError: true, isFetching: false, refetch })} what="места">
        {() => <p>Места</p>}
      </QueryState>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить места')
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('не запускает несколько повторных запросов одновременно', () => {
    render(
      <QueryState query={state({ isError: true, isFetching: true })} what="маршруты">
        {() => <p>Маршруты</p>}
      </QueryState>,
    )
    expect(screen.getByRole('button', { name: 'Повторяем…' })).toBeDisabled()
  })
})
