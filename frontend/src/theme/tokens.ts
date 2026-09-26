/**
 * Токены темы — единый источник цветов, типографики, скруглений и теней для интерфейса и стиля карты.
 * Палитра — «Универсальный вариант», форма и карта — дизайн «Стол и газета» (ADR 0012).
 * Дизайнер меняет значения здесь; CSS-переменные и карта подхватывают их автоматически.
 * Все пары текст/фон проверены на контраст WCAG AA (≥ 4,5:1), см. docs/adr/0003-map.md.
 */
export const tokens = {
  color: {
    paper: '#F2E8D5', // фон — бумага
    surface: '#FBF6EC', // карточки, панели
    ink: '#2B2A26', // тушь: основной текст, 11,8:1 на paper
    inkMuted: '#5E574B', // вторичный текст, 5,9:1 на paper
    line: '#D8CBAE', // разделители, дорожки прогресса — только декор
    lineStrong: '#C9B994', // рамки декоративных плашек
    olive: '#4B5320', // основной цвет: активные чипсы, вторичные кнопки, счётчики
    sepia: '#8B6B45',
    controlBorder: '#8B6B45', // рамки полей, чекбоксов и вариантов: 4,9:1 к белому (WCAG 1.4.11 ≥ 3:1)
    accent: '#B4531A', // оранжевый акцент: главная кнопка, маршрут, выделение; белый текст 5,0:1
    accentLight: '#E8A15A', // рамка задания, звезда логотипа — только декор
    accentOnDark: '#F2C08E', // активный пункт меню на тёмном
    accentText: '#8E3F12', // акцентный текст на светлом, 6,8:1
    rail: '#2B2A26', // тёмная панель разделов и уведомления
    railText: '#CFC4A8', // неактивные пункты меню на тёмном, 8,3:1
    railActive: '#4A4636', // подложка активного пункта меню; accentOnDark на ней 5,7:1
    counterMuted: '#DCD6B8', // подписи на оливковом блоке счётчика, 5,6:1
    danger: '#A33227', // ошибки и неверный ответ
    dangerSoft: '#F3E0D8', // фон плашек «закрытые координаты» и ошибок
    dangerText: '#5A2119', // текст на dangerSoft, 9,9:1
    focus: '#B4531A',
    /** Статусы «Последнего боя»: в интерфейсе всегда вместе с иконкой и подписью. */
    status: {
      found_needs_check: '#A33227',
      archive_confirmed: '#8A6216',
      remains_raised: '#3F6B3B',
    },
    /** Типы точек маршрута: звезда — бой, каска — окоп, книга — штаб; пройденная — зелёная с ✓. */
    point: {
      battle: '#C8261C', // бой — красная метка, белая иконка 5,1:1
      trench: '#8B6B45',
      hq: '#8B6B45',
      done: '#3F6B3B',
    },
    /** Стиль карты — военная картография: оливковый, хаки, сепия + яркие акценты для детей (ADR 0012). */
    map: {
      land: '#DCD2AB',
      residential: '#D2C69C',
      field: '#D0C396',
      wood: '#A3A474',
      woodHatch: 'rgba(62,70,26,0.55)',
      park: '#B7B584',
      water: '#8FA59C',
      waterLine: '#6E8A83',
      building: '#B8A57A',
      buildingLine: '#8B6B45',
      road: '#F1E7C8',
      roadCasing: '#7A5A33',
      rail: '#4A3A22',
      boundary: '#6E4F2A',
      label: '#33291A',
      labelHalo: '#E6DCB8',
      grid: 'rgba(110,79,42,0.30)',
      /** Маршрут — георгиевская лента: чёрный край, оранжевая лента, чёрная осевая. */
      route: '#EE7F1B',
      routeHalo: '#1E1912',
      /** Метки мест — красные, выбранная — с оранжевым кольцом. */
      marker: '#C8261C',
      selected: '#EE7F1B',
      grave: '#2B2A26',
      /** Памятники и музеи из OpenStreetMap — тёмно-коричневые, спокойнее красных меток. */
      memorial: '#6B3F1D',
      me: '#2F5D7C', // «Вы здесь» — синий, как принято на картах
    },
  },
  font: {
    body: "'PT Sans', 'Noto Sans', system-ui, sans-serif",
    heading: "'Oswald', 'PT Sans', 'Arial Narrow', sans-serif",
    mono: "'PT Mono', 'Courier New', monospace",
  },
  /** Базовый размер 18px — для детей и пожилых поисковиков; всё в rem. */
  fontSizeBase: '112.5%',
  /** Газетная вёрстка: почти прямые углы, панели вместо «пузырей» (ADR 0012). */
  radius: {
    control: '3px', // кнопки, поля
    card: '3px', // карточки и панели списка
    panel: '3px', // плавающие панели и шторка карты
    pill: '3px', // чипсы и плашки — тоже прямые, как типографские штампы
  },
  shadow: {
    card: 'none',
    float: '0 2px 6px rgb(0 0 0 / 0.25)',
    panel: '0 4px 14px rgb(0 0 0 / 0.3)',
  },
  /** Минимальная зона нажатия 48px, главная кнопка — 56px. */
  touchMin: '3rem',
  touchMain: '3.5rem',
} as const

export type Tokens = typeof tokens

/** Токены → CSS-переменные на :root: color.map.land → --color-map-land, radius.card → --radius-card. */
export function applyTheme(t: Tokens = tokens, root: HTMLElement = document.documentElement) {
  const set = (name: string, value: string) => root.style.setProperty(name, value)
  const walk = (prefix: string, obj: object) => {
    for (const [key, value] of Object.entries(obj)) {
      const name = `${prefix}-${key.replace(/[A-Z_]/g, (m) => '-' + m.replace('_', '').toLowerCase())}`
      if (typeof value === 'string') set(name, value)
      else walk(name, value as object)
    }
  }
  walk('--color', t.color)
  walk('--font', t.font)
  walk('--radius', t.radius)
  walk('--shadow', t.shadow)
  set('--font-size-base', t.fontSizeBase)
  set('--touch-min', t.touchMin)
  set('--touch-main', t.touchMain)
}
