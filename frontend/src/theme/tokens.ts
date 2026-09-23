/**
 * Токены темы — единый источник цветов и типографики для интерфейса и стиля карты.
 * Дизайнер меняет значения здесь; CSS-переменные и карта подхватывают их автоматически.
 * Все пары текст/фон проверены на контраст WCAG AA (≥ 4,5:1), см. docs/adr/0003-map.md.
 */
export const tokens = {
  color: {
    paper: '#F4ECD8', // фон — старая карта
    surface: '#FBF7EC', // карточки
    ink: '#2A2A1E', // основной текст, 12,3:1 на paper
    inkMuted: '#5A5238', // вторичный текст, 6,6:1
    olive: '#4B5320',
    oliveDark: '#353B16', // навигация
    khaki: '#A39A6A', // только декор и линии
    sepia: '#6B4A1F',
    ribbonOrange: '#F28C28', // георгиевская лента: акцент для детей, текст на нём — ink
    ribbonBlack: '#1B1B14',
    red: '#B3261E', // главная кнопка, белый текст 6,5:1
    focus: '#C25A00',
    status: {
      found_needs_check: '#B3261E',
      archive_confirmed: '#1F4E8C',
      remains_raised: '#2E6B30',
    },
    map: {
      land: '#EFE4C8',
      water: '#A9BFB8',
      waterLine: '#7F9A93',
      wood: '#C9C79A',
      park: '#D5D2A4',
      road: '#FFFDF5',
      roadCasing: '#B8A77A',
      building: '#DCCDA8',
      boundary: '#8A7A55',
      label: '#3E3A28',
      labelHalo: '#F4ECD8',
      route: '#B3261E',
      grave: '#4B5320',
    },
  },
  font: {
    body: "'PT Sans', 'Noto Sans', system-ui, sans-serif",
    heading: "'PT Serif', 'Noto Serif', Georgia, serif",
  },
  /** Базовый размер 18px — для детей и пожилых поисковиков; всё в rem. */
  fontSizeBase: '112.5%',
  radius: '0.75rem',
  /** Минимальная зона нажатия 48px, главная кнопка — 56px. */
  touchMin: '3rem',
  touchMain: '3.5rem',
} as const

export type Tokens = typeof tokens

/** Токены → CSS-переменные на :root. */
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
  set('--font-body', t.font.body)
  set('--font-heading', t.font.heading)
  set('--font-size-base', t.fontSizeBase)
  set('--radius', t.radius)
  set('--touch-min', t.touchMin)
  set('--touch-main', t.touchMain)
}
