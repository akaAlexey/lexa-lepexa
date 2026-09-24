/** Прогресс сбора в процентах 0…100 (переполнение не ломает шкалу). */
export function progressPercent(collected: number, goal: number): number {
  if (goal <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((collected / goal) * 100)))
}
