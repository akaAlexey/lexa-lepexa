import type { RouteObject } from 'react-router'
import { GroupApplicationScreen } from './GroupApplicationScreen.tsx'
import { TripScreen } from './TripScreen.tsx'
import { WeekendsScreen } from './WeekendsScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'weekends', element: <WeekendsScreen /> },
  { path: 'weekends/:tripId', element: <TripScreen /> },
  { path: 'weekends/:tripId/group', element: <GroupApplicationScreen /> },
]
