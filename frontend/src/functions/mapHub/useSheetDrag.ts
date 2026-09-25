import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { tokens } from '../../theme/tokens.ts'
import { SNAPS, clampRatio, nearestSnap, stepSnap, type Snap } from './sheet.ts'

const [, , MAX] = SNAPS
/** Сдвиг пальца, после которого нажатие становится перетаскиванием (иначе это клик по вкладке или ручке). */
const DRAG_THRESHOLD = 6

/** Видимая высота экрана: visualViewport учитывает клавиатуру и масштаб, innerHeight — запасной вариант. */
function viewportHeight(): number {
  const vv = window.visualViewport
  return vv ? vv.height * vv.scale : window.innerHeight
}

/** Сколько пикселей шторке можно занять: от низа родителя до элемента, который нельзя закрывать. */
function available(sheet: HTMLElement | null, keepClear: string): number {
  const parent = sheet?.parentElement
  const clear = parent?.querySelector(keepClear)
  if (!parent || !clear) return Infinity
  return (
    parent.getBoundingClientRect().bottom -
    clear.getBoundingClientRect().bottom -
    tokens.map.sheetGap
  )
}

interface Drag {
  pointerId: number
  startY: number
  startRatio: number
  ratio: number
  lastY: number
  lastT: number
  velocity: number
  active: boolean
  frame: number
}

export interface SheetDrag {
  /** Ссылка на шторку: ей выставляются высота и сдвиг. */
  attach: (el: HTMLElement | null) => void
  /** Текущая точка фиксации. */
  snap: Snap
  /** Видимая высота шторки в пикселях — нижний отступ карты. */
  visibleHeight: number
  /** CSS-переменные шторки: полная высота и сдвиг вниз. */
  style: CSSProperties
  /** Обработчики для ручки и заголовка: тянуть пальцем и мышью. */
  dragProps: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void
    onPointerMove: (e: PointerEvent<HTMLElement>) => void
    onPointerUp: (e: PointerEvent<HTMLElement>) => void
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void
  }
  /** Клавиатура на ручке: ↑ ↓ Home End. */
  onHandleKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  /** Нажатие на ручку без перетаскивания: следующая точка по кругу. */
  onHandleClick: () => void
  /** Перейти к точке (например, при выборе места — чтобы карточка была видна). */
  setSnap: (snap: Snap) => void
}

/**
 * Шторка с перетаскиванием (замечание #14). Во время движения — transform через requestAnimationFrame,
 * без setState на каждое движение; после отпускания — доводка к точке фиксации CSS-переходом
 * (при prefers-reduced-motion переход отключён в стилях). `keepClear` — селектор элемента в родителе шторки
 * (поле поиска), который она не закрывает; высоты пересчитываются при resize и масштабировании.
 */
export function useSheetDrag(keepClear: string): SheetDrag {
  const el = useRef<HTMLElement | null>(null)
  const drag = useRef<Drag | null>(null)
  const moved = useRef(false)
  const [snap, setSnapState] = useState<Snap>(SNAPS[0])
  const [size, setSize] = useState(() => ({ vh: viewportHeight(), limit: Infinity }))

  const measure = useCallback(() => {
    setSize((prev) => {
      const next = { vh: viewportHeight(), limit: available(el.current, keepClear) }
      return prev.vh === next.vh && prev.limit === next.limit ? prev : next
    })
  }, [keepClear])

  useEffect(() => {
    measure()
    const vv = window.visualViewport
    window.addEventListener('resize', measure)
    vv?.addEventListener('resize', measure)
    const parent = el.current?.parentElement
    const observer = parent && 'ResizeObserver' in window ? new ResizeObserver(measure) : undefined
    if (parent) observer?.observe(parent)
    return () => {
      window.removeEventListener('resize', measure)
      vv?.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [measure])

  const full = Math.max(0, Math.min(MAX * size.vh, size.limit))
  const px = useCallback((ratio: number) => Math.min(ratio * size.vh, full), [size.vh, full])
  const visibleHeight = Math.round(px(snap))

  const attach = useCallback((node: HTMLElement | null) => {
    el.current = node
  }, [])

  const finish = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    cancelAnimationFrame(d.frame)
    if (!d.active) return
    const node = el.current
    if (node) {
      // Снять ручной сдвиг: CSS-переход доведёт шторку от текущего положения до точки фиксации
      node.style.transform = ''
      delete node.dataset.dragging
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
    setSnapState(nearestSnap(d.ratio, d.velocity))
  }

  const dragProps: SheetDrag['dragProps'] = {
    onPointerDown: (e) => {
      if (e.button !== 0) return
      moved.current = false
      drag.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startRatio: px(snap) / size.vh,
        ratio: px(snap) / size.vh,
        lastY: e.clientY,
        lastT: e.timeStamp,
        velocity: 0,
        active: false,
        frame: 0,
      }
    },
    onPointerMove: (e) => {
      const d = drag.current
      const node = el.current
      if (!d || d.pointerId !== e.pointerId || !node) return
      if (!d.active) {
        if (Math.abs(e.clientY - d.startY) < DRAG_THRESHOLD) return
        d.active = true
        moved.current = true
        node.dataset.dragging = ''
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      const dt = e.timeStamp - d.lastT
      // Вверх — плюс: доля высоты экрана в секунду
      if (dt > 0) d.velocity = ((d.lastY - e.clientY) / size.vh / dt) * 1000
      d.lastY = e.clientY
      d.lastT = e.timeStamp
      d.ratio = clampRatio(d.startRatio + (d.startY - e.clientY) / size.vh)
      cancelAnimationFrame(d.frame)
      d.frame = requestAnimationFrame(() => {
        node.style.transform = `translateY(${full - px(d.ratio)}px)`
      })
    },
    onPointerUp: finish,
    onPointerCancel: finish,
  }

  const onHandleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const step =
      e.key === 'ArrowUp'
        ? 'up'
        : e.key === 'ArrowDown'
          ? 'down'
          : e.key === 'Home'
            ? 'first'
            : e.key === 'End'
              ? 'last'
              : undefined
    if (!step) return
    e.preventDefault()
    setSnapState(stepSnap(snap, step))
  }

  const onHandleClick = () => {
    // Клик после перетаскивания не считается
    if (moved.current) {
      moved.current = false
      return
    }
    const i = SNAPS.indexOf(snap)
    setSnapState(SNAPS[(i + 1) % SNAPS.length] ?? SNAPS[0])
  }

  const style = {
    '--sheet-full': `${Math.round(full)}px`,
    '--sheet-offset': `${Math.round(full - px(snap))}px`,
  } as CSSProperties

  return {
    attach,
    snap,
    visibleHeight,
    style,
    dragProps,
    onHandleKeyDown,
    onHandleClick,
    setSnap: setSnapState,
  }
}
