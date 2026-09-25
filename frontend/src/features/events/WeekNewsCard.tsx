import { useId } from 'react'
import { formatDayRu } from '../../domain/format.ts'
import { useWeekNews, useWeekNewsOpen } from '../../functions/events/useEvents.ts'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
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
 * По умолчанию свёрнуты (решение команды): заголовок, даты и число новостей; раскрываются
 * заголовком-кнопкой плавно, выбор запоминается. Пометка «Демо» — у заголовка (сейчас скрыта
 * флагом SHOW_DEMO_BADGES, см. ui/DemoBadge).
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
            {day(news.from)} — {day(news.to)} · {newsCount(news.items.length)}
          </span>
          <DemoBadge />
        </p>
      </header>
      <div className={s.weekBody} data-open={open || undefined}>
        <div id={bodyId} className={s.weekInner} inert={!open}>
          {news.items.map((n) => (
            <div key={n.id} className={s.weekItem}>
              <p className={ui.kick}>
                {formatDayRu(n.date)} · {n.team} · {n.kind} <DemoBadge />
              </p>
              <p className={s.weekText}>{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
