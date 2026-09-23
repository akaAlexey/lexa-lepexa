import type { RouteObject } from 'react-router'
import { TripScreen } from './TripScreen.tsx'
import { WeekendsScreen } from './WeekendsScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'weekends', element: <WeekendsScreen /> },
  { path: 'weekends/:tripId', element: <TripScreen /> },
]
