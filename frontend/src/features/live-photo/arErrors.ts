/** Сколько ждём запуска камеры и распознавания, прежде чем предложить ролик без камеры. */
export const START_TIMEOUT_MS = 20_000

/** Причина, почему камера не включилась, — словами, понятными без знания браузеров. */
export function describeCameraError(e: unknown): string {
  const name = e instanceof DOMException || e instanceof Error ? e.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Доступ к камере запрещён. Разрешите камеру для этого сайта в настройках браузера'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'На устройстве не нашлась подходящая камера'
    case 'NotReadableError':
      return 'Камера занята другим приложением. Закройте его и попробуйте снова'
    case 'TimeoutError':
      return 'Камера не запустилась за 20 секунд — возможно, медленная сеть'
    default:
      return e instanceof Error && e.message ? e.message : 'Не удалось включить камеру'
  }
}
