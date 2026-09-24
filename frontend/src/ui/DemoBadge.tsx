import s from './ui.module.css'

/** Пометка демо-данных. Этика: придуманное не выдаём за реальное. */
export function DemoBadge({ text = 'Демо-данные' }: { text?: string }) {
  return (
    <span className={s.demoBadge} title="Данные вымышлены или не проверены">
      {text}
    </span>
  )
}
