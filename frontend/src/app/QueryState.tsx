import type { Loadable } from '../functions/core/query.ts'
import type { ReactNode } from 'react'
import { Button } from '../ui/Button.tsx'
import { Notice } from '../ui/Notice.tsx'

/** Единые состояния загрузки и ошибки: крупно, по-русски, с повтором. */
export function QueryState<T>({
  query,
  children,
  what,
}: {
  query: Loadable<T>
  children: (data: T) => ReactNode
  what: string
}) {
  if (query.isPending) {
    return <Notice testID="loading">Загружаем {what}…</Notice>
  }
  if (query.isError) {
    return (
      <Notice tone="error" testID="error">
        <p>Не удалось загрузить {what}. Проверьте связь и попробуйте ещё раз.</p>
        <Button
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          testID="query-retry"
        >
          {query.isFetching ? 'Повторяем…' : 'Повторить'}
        </Button>
      </Notice>
    )
  }
  return <>{children(query.data)}</>
}
