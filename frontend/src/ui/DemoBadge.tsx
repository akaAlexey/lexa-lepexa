import s from './ui.module.css'

/**
 * Пометка демо-данных. По решению команды (сентябрь 2026) пометки «Демо» на сайте не показываются:
 * компонент оставлен, чтобы вернуть пометку одной строкой. Признак `demo` в данных сохраняется.
 */
export const SHOW_DEMO_BADGES = false

export function DemoBadge({ text = 'Демо-данные' }: { text?: string }) {
  if (!SHOW_DEMO_BADGES) return null
  return (
    <span className={s.demoBadge} title="Данные вымышлены или не проверены">
      {text}
    </span>
  )
}
