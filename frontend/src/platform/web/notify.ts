import type { NotifyPermission, NotifyService } from '../types.ts'

/** Web Notifications API. Нужен защищённый контекст; на демо основной канал — тост в приложении. */
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
      if (url) n.onclick = () => window.location.assign(url)
    },
  }
}
