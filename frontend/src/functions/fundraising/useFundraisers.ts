import { useQuery } from '@tanstack/react-query'
import type { Fundraiser } from '../../contract/schemas.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'

/** Целевые сборы отрядов («на бензин» и другие). */
export function useFundraisers(): Loadable<Fundraiser[]> {
  const { api } = useDeps()
  return useQuery({ queryKey: qk.fundraisers, queryFn: api.listFundraisers })
}
