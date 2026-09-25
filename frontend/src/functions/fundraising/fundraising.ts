import type { ApiClient } from '../../api/index.ts'
import type { Fundraiser } from '../../contract/schemas.ts'
import { progressPercent } from '../../domain/fundraising.ts'
import type { Deps } from '../core/deps.ts'

/** Суммы пожертвования в одно нажатие, ₽. */
export const DONATION_AMOUNTS = [100, 300, 500, 1000] as const
/** Сумма, выбранная при открытии. */
export const DEFAULT_DONATION = 300

export type DonationResult = Awaited<ReturnType<ApiClient['donate']>>

/** Прогресс сбора в процентах 0…100 для шкалы. */
export function fundProgress(f: Pick<Fundraiser, 'collectedRub' | 'goalRub'>): number {
  return progressPercent(f.collectedRub, f.goalRub)
}

/** Открытый сбор отряда с наибольшим дефицитом — туда ведёт «Пожертвовать отряду». */
export function neediestFundraiserOfTeam(
  fundraisers: readonly Fundraiser[],
  teamId: string,
): Fundraiser | undefined {
  return fundraisers
    .filter((f) => f.teamId === teamId && f.collectedRub < f.goalRub)
    .sort((a, b) => b.goalRub - b.collectedRub - (a.goalRub - a.collectedRub))[0]
}

/**
 * Пожертвование — только тестовый режим платёжного провайдера: деньги не списываются.
 * Кэш сборов после ответа обновляет хук `useDonate`.
 */
/** Пожертвование через ЮKassa: сервер создаёт платёж и возвращает ссылку на страницу оплаты. */
export function startPayment(
  { api }: Pick<Deps, 'api'>,
  fundraiserId: string,
  amountRub: number,
  returnPath: string,
) {
  return api.startPayment({ body: { fundraiserId, amountRub, returnPath } })
}

export function donate(
  { api }: Pick<Deps, 'api'>,
  fundraiserId: string,
  amountRub: number,
): Promise<DonationResult> {
  return api.donate({ body: { fundraiserId, amountRub } })
}
