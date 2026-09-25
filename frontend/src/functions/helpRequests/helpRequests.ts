import type { ApiClient } from '../../api/index.ts'
import { region } from '../../config/region.ts'
import type { Team, VolunteerRequest } from '../../contract/schemas.ts'
import { todayIso } from '../../domain/dates.ts'
import { progressPercent } from '../../domain/fundraising.ts'
import type { Deps } from '../core/deps.ts'
import { memory, readMemory, updateMemory } from '../core/deviceMemory.ts'

/** Счётчик «Найдено бойцов за месяц» и его месяц. */
export type SearchStats = Awaited<ReturnType<ApiClient['getSearchStats']>>

/** Заявки, в которые пользователь записался на этом устройстве. */
export function joinedRequests({ platform }: Pick<Deps, 'platform'>): string[] {
  return readMemory(platform.storage, memory.joinedRequests)
}

/**
 * «Стать частью команды»: записаться в заявку и запомнить запись на устройстве.
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

/** Ближайшая по дате заявка, в которую ещё не записались (в демо — R01). Прошедшие не предлагаются. */
export function nearestOpen(
  requests: readonly VolunteerRequest[],
  joined: readonly string[],
  today: string,
): VolunteerRequest | undefined {
  return requests
    .filter((r) => !joined.includes(r.id) && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))[0]
}

/** Ближайшая открытая заявка на сегодня по Москве — цель главной кнопки волонтёра. */
export function nextToJoin(
  deps: Pick<Deps, 'now'>,
  requests: readonly VolunteerRequest[],
  joined: readonly string[],
): VolunteerRequest | undefined {
  return nearestOpen(requests, joined, todayIso(deps.now()))
}

/** Отряды, которым не хватает на экспедиции (дефицит бюджета), в прежнем порядке. */
export function teamsShortOfBudget(teams: readonly Team[]): Team[] {
  return teams.filter((t) => t.budgetCollectedRub < t.budgetGoalRub)
}

/** Сколько собрано на экспедиции отряда, % 0…100 для шкалы. */
export function budgetProgress(team: Pick<Team, 'budgetCollectedRub' | 'budgetGoalRub'>): number {
  return progressPercent(team.budgetCollectedRub, team.budgetGoalRub)
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
