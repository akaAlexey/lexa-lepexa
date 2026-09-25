import { region } from '../../config/region.ts'
import type { Team, VolunteerRequest } from '../../contract/schemas.ts'
import type { Deps } from '../core/deps.ts'
import { memory, readMemory, updateMemory } from '../core/deviceMemory.ts'

/** Заявки, в которые пользователь записался на этом устройстве. */
export function joinedRequests({ platform }: Pick<Deps, 'platform'>): string[] {
  return readMemory(platform.storage, memory.joinedRequests)
}

/**
 * Записаться в заявку отряда и запомнить запись на устройстве.
 * Возвращает новый список записей; при ошибке сети память не меняется.
 */
export async function joinRequest(
  { api, platform }: Pick<Deps, 'api' | 'platform'>,
  id: string,
): Promise<string[]> {
  await api.joinRequest({ id })
  return updateMemory(platform.storage, memory.joinedRequests, (prev) => [
    ...prev.filter((j) => j !== id),
    id,
  ])
}

/** Отряд командира (демо) и его последняя заявка — шаблон новой. Список заявок — свежие первыми. */
export function commanderTeam(
  teams: readonly Team[],
  requests: readonly VolunteerRequest[],
): { team: Team; last: VolunteerRequest | undefined } | undefined {
  const team = teams.find((t) => t.id === region.demo.commanderTeamId)
  if (!team) return undefined
  return { team, last: requests.find((r) => r.teamId === team.id) }
}
