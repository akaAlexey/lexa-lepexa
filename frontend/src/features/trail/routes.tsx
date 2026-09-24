import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { FinishScreen } from './FinishScreen.tsx'
import { PointScreen } from './PointScreen.tsx'
import { TrailScreen } from './TrailScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: patterns.trail, element: <TrailScreen /> },
  { path: patterns.point, element: <PointScreen /> },
  { path: patterns.finish, element: <FinishScreen /> },
]
