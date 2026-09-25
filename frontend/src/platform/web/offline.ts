/**
 * Офлайн (X5): после первого открытия сайт, карта и тропа открываются без сети.
 * Сервис-воркер — `public/sw.js`; регистрируется только в сборке для сайта и по https (или localhost).
 */
export function registerOffline(base: string = import.meta.env.BASE_URL): void {
  if (!import.meta.env.PROD || import.meta.env.VITE_OFFLINE === 'off') return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // Без офлайна сайт работает как обычно
    })
  })
}
