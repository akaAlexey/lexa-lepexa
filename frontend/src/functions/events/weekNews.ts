import { addDaysIso, todayIso } from '../../domain/dates.ts'

/**
 * «Новости недели» — первая строка ленты «Мероприятия» (ADR 0011).
 * Эндпоинта новостей у бэкенда пока нет: это демо-заметки с плашкой «Демо-данные»,
 * датированные текущей неделей. Когда появится `/news`, данные придут оттуда.
 */
export interface WeekNewsItem {
  id: string
  /** YYYY-MM-DD */
  date: string
  team: string
  kind: 'Находка' | 'Выезд'
  text: string
  demo: true
}

export interface WeekNews {
  from: string
  to: string
  items: WeekNewsItem[]
}

export function weekNews(now: Date): WeekNews {
  const today = todayIso(now)
  const d2 = addDaysIso(today, -2)
  const d1 = addDaysIso(today, -1)
  return {
    from: addDaysIso(today, -6),
    to: today,
    items: [
      {
        id: 'news-find',
        date: d2,
        team: 'Отряд «Высота-6»',
        kind: 'Находка',
        text: 'Поисковый отряд «Высота-6» нашёл у поляны Лужная старую пехотную лопатку, 26 гильз и шлем времён войны. В поиске участвовали 13 волонтёров от 13 до 17 лет.',
        demo: true,
      },
      {
        id: 'news-trip',
        date: d1,
        team: 'Отряд «Юнармия»',
        kind: 'Выезд',
        text: 'Отряд «Юнармия» провёл выезд в парк «Патриот». Дети слушали истории поисковиков о найденных медальонах и учились читать военную карту.',
        demo: true,
      },
    ],
  }
}
