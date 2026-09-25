import { useId } from 'react'
import { formatDayRu } from '../../domain/format.ts'
import { useWeekNews, useWeekNewsOpen } from '../../functions/events/useEvents.ts'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import ui from '../../ui/ui.module.css'
import s from './events.module.css'

const short = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const day = (iso: string) => short.format(new Date(`${iso}T00:00:00Z`))

/**
 * «Новости недели» — всегда первая строка ленты: находки и выезды отрядов за неделю.
 * Сворачиваются заголовком-кнопкой, выбор запоминается. Пометка «Демо-данные» — у заголовка,
 * поэтому видна и в свёрнутом виде (аудит P0-5).
 */
export function WeekNewsCard() {
  const news = useWeekNews()
  const [open, toggle] = useWeekNewsOpen()
  const bodyId = useId()
  return (
    <section className={s.week} aria-label="Новости недели" data-testid="week-news">
      <header className={s.weekHead}>
        <h2 className={s.weekTitle}>
          <button
            type="button"
            className={s.weekToggle}
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={toggle}
            data-testid="week-news-toggle"
          >
            <span>Новости недели</span>
            <span className={s.weekHint}>
              {open ? 'Свернуть' : 'Развернуть'}
              <Icon name="chevron" size={1.1} />
            </span>
          </button>
        </h2>
        <p className={s.weekMeta}>
          <span className={ui.kick}>
            {day(news.from)} — {day(news.to)}
          </span>
          <DemoBadge />
        </p>
      </header>
      <div id={bodyId} hidden={!open}>
        {news.items.map((n) => (
          <div key={n.id} className={s.weekItem}>
            <p className={ui.kick}>
              {formatDayRu(n.date)} · {n.team} · {n.kind} <DemoBadge />
            </p>
            <p className={s.weekText}>{n.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
