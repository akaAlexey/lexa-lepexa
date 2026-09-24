import type { RouteObject } from 'react-router'
import { FinishScreen } from './FinishScreen.tsx'
import { PointScreen } from './PointScreen.tsx'
import { TrailScreen } from './TrailScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'trail', element: <TrailScreen /> },
  { path: 'trail/:routeId/point/:pointId', element: <PointScreen /> },
  { path: 'trail/:routeId/finish', element: <FinishScreen /> },
]
