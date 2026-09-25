/** Функция «Выезды» (V1, V2): список, карточка, свободные места, запись и чек-лист новичка. */
export {
  freeSpots,
  getTrip,
  listTrips,
  NEAR_TRIP_RADIUS_KM,
  nearestTrip,
  registerTrip,
  replaceTrip,
  spotsText,
} from './trips.ts'
export {
  checklistOf,
  savedChecklist,
  toggleChecklist,
  type ChecklistProgress,
} from './checklist.ts'
export { useTrip, useTrips } from './useTrips.ts'
export { useChecklist, type ChecklistState } from './useChecklist.ts'
