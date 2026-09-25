import type { UseQueryResult } from '@tanstack/react-query'

/**
 * Загружаемые данные для экрана: хуки функций возвращают результат запроса как есть,
 * `app/QueryState` показывает загрузку, ошибку и повтор. Экран не знает про кэш.
 */
export type Loadable<T> = UseQueryResult<T>
