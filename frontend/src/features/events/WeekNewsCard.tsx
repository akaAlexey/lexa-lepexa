import { useId, useState } from 'react'
import { formatDayRu } from '../../domain/format.ts'
import { useWeekNews } from '../../functions/events/useEvents.ts'
import { Icon } from '../../ui/Icon.tsx'
import ui from '../../ui/ui.module.css'
import s from './events.module.css'

const short = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const day = (iso: string) => short.format(new Date(`${iso}T00:00:00Z`))
const plural = new Intl.PluralRules('ru-RU')
const NEWS_WORD = { one: 'новость', few: 'новости', many: 'новостей', other: 'новости' } as const
const newsCount = (n: number) =>
  `${n} ${NEWS_WORD[plural.select(n) as keyof typeof NEWS_WORD] ?? 'новостей'}`

/**
 * «Новости недели» — всегда первая строка ленты: находки и выезды отрядов за неделю.
 * По умолчанию свёрнута: заголовок и число новостей, по нажатию раскрывается.
 */
export function WeekNewsCard() {
  const news = useWeekNews()
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  return (
    <section className={s.week} aria-labelledby="week-news-title" data-testid="week-news">
      <button
        type="button"
        className={s.weekHead}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        data-testid="week-news-toggle"
      >
        <span className={s.weekHeadText}>
          <h2 id="week-news-title">Новости недели</h2>
          <span className={ui.kick}>
            {day(news.from)} — {day(news.to)} · {newsCount(news.items.length)}
          </span>
        </span>
        <span className={s.weekArrow} data-open={open || undefined} aria-hidden="true">
          <Icon name="chevron" size={1.2} />
        </span>
      </button>
      <div className={s.weekBody} data-open={open || undefined}>
        <div id={bodyId} className={s.weekInner} inert={!open}>
          {news.items.map((n) => (
            <div key={n.id} className={s.weekItem}>
              <p className={ui.kick}>
                {formatDayRu(n.date)} · {n.team} · {n.kind}
              </p>
              <p className={s.weekText}>{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
