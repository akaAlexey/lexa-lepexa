import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { GroupApplicationScreen } from './GroupApplicationScreen.tsx'
import { TripScreen } from './TripScreen.tsx'
import { WeekendsScreen } from './WeekendsScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: patterns.weekends, element: <WeekendsScreen /> },
  { path: patterns.trip, element: <TripScreen /> },
  { path: patterns.tripGroup, element: <GroupApplicationScreen /> },
]
