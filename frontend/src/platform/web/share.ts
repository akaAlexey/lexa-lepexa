import type { ShareResult, ShareService } from '../types.ts'

/**
 * Web Share API на телефоне, копирование ссылки на ноутбуке.
 * В Android (Capacitor) заменяется нативным плагином Share без изменения экранов.
 */
export function createWebShare(): ShareService {
  return {
    async share({ title, text, url }): Promise<ShareResult> {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text, url })
          return 'shared'
        } catch (e) {
          // Человек закрыл меню «Поделиться» — это не ошибка, ссылку не копируем.
          if (e instanceof DOMException && e.name === 'AbortError') return 'shared'
        }
      }
      try {
        await navigator.clipboard.writeText(url)
        return 'copied'
      } catch {
        return 'unsupported'
      }
    },
  }
}
