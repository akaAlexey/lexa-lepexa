import { useQuery } from '@tanstack/react-query'
import type { Team, VolunteerRequest } from '../../contract/schemas.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'

/** Заявки отрядов — свежие первыми. */
export function useRequests(): Loadable<VolunteerRequest[]> {
  const { api } = useDeps()
  return useQuery({ queryKey: qk.requests, queryFn: api.listRequests })
}

/** Поисковые отряды и их бюджеты. */
export function useTeams(): Loadable<Team[]> {
  const { api } = useDeps()
  return useQuery({ queryKey: qk.teams, queryFn: api.listTeams })
}
