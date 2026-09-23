import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/** Единые состояния загрузки и ошибки: крупно, по-русски, с повтором. */
export function QueryState<T>({
  query,
  children,
  what,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  what: string
}) {
  if (query.isPending) {
    return (
      <p role="status" data-testid="loading">
        Загружаем {what}…
      </p>
    )
  }
  if (query.isError) {
    return (
      <div role="alert" data-testid="error">
        <p>Не удалось загрузить {what}. Проверьте связь и попробуйте ещё раз.</p>
        <button type="button" onClick={() => void query.refetch()} style={{ minHeight: '3rem' }}>
          Повторить
        </button>
      </div>
    )
  }
  return <>{children(query.data)}</>
}
