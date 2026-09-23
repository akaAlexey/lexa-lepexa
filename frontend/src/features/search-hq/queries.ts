/** Ключи запросов модуля: экраны инвалидируют их после изменений. */
export const qk = {
  requests: ['requests'],
  teams: ['teams'],
  fundraisers: ['fundraisers'],
  stats: ['stats'],
} as const

/** Признак, с которым форма заявки возвращает на ленту после публикации. */
export interface PublishedState {
  publishedId: string
}

export function isPublishedState(state: unknown): state is PublishedState {
  return typeof state === 'object' && state !== null && 'publishedId' in state
}

/** Заявки, в которые пользователь записался на этом устройстве. */
export const JOINED_KEY = 'search.joinedRequests'

const numberRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** 15000 → «15 000» (без знака валюты — для «Собрано: 15 000 из 50 000 ₽»). */
export function formatNumberRu(n: number): string {
  return numberRu.format(n)
}
