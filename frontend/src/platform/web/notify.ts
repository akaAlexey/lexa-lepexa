import type { NotifyPermission, NotifyService } from '../types.ts'

/** Web Notifications API. Нужен защищённый контекст; на демо основной канал — тост в приложении. */
/** '/last-battle/S01' → '/lexa-lepexa/last-battle/S01' при сборке с --base=/lexa-lepexa/. */
export function withBase(url: string, base: string = import.meta.env.BASE_URL): string {
  return url.startsWith('/') ? `${base.replace(/\/$/, '')}${url}` : url
}

export function createWebNotify(): NotifyService {
  const supported = () => typeof Notification !== 'undefined'
  return {
    permission: () => (supported() ? Notification.permission : 'unsupported'),
    async requestPermission(): Promise<NotifyPermission> {
      if (!supported()) return 'unsupported'
      return Notification.requestPermission()
    },
    show({ title, body, url }) {
      if (!supported() || Notification.permission !== 'granted') return
      const n = new Notification(title, { body, lang: 'ru' })
      // Адрес экрана — от корня приложения: на GitHub Pages оно живёт в /lexa-lepexa/, на домене — в /
      if (url) n.onclick = () => window.location.assign(withBase(url))
    },
  }
}
