import { formatDayRu } from '../../domain/format.ts'
import { useWeekNews } from '../../functions/events/useEvents.ts'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import ui from '../../ui/ui.module.css'
import s from './events.module.css'

const short = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const day = (iso: string) => short.format(new Date(`${iso}T00:00:00Z`))

/** «Новости недели» — всегда первая строка ленты: находки и выезды отрядов за неделю. */
export function WeekNewsCard() {
  const news = useWeekNews()
  return (
    <section className={s.week} aria-labelledby="week-news-title" data-testid="week-news">
      <header className={s.weekHead}>
        <h2 id="week-news-title">Новости недели</h2>
        <span className={ui.kick}>
          {day(news.from)} — {day(news.to)}
        </span>
      </header>
      {news.items.map((n) => (
        <div key={n.id} className={s.weekItem}>
          <p className={ui.kick}>
            {formatDayRu(n.date)} · {n.team} · {n.kind}
          </p>
          <p className={s.weekText}>{n.text}</p>
        </div>
      ))}
      <p className={s.weekFoot}>
        <DemoBadge />
      </p>
    </section>
  )
}
