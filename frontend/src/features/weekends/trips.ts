import type { Trip } from '../../contract/schemas.ts'

export const freeSpots = (t: Trip) => Math.max(0, t.spotsTotal - t.spotsTaken)

/** «Свободно мест: 7 из 12» — как в прототипе. */
export const spotsText = (t: Trip) => `Свободно мест: ${freeSpots(t)} из ${t.spotsTotal}`

export const checklistKey = (tripId: string) => `checklist:${tripId}`
