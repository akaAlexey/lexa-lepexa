import type { RouteObject } from 'react-router'
import { NotImplementedScreen } from '../../app/NotImplementedScreen.tsx'
import { TrailScreen } from './TrailScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'trail', element: <TrailScreen /> },
  {
    path: 'trail/:routeId/point/:pointId',
    element: <NotImplementedScreen what="Точка маршрута" />,
  },
  { path: 'trail/:routeId/finish', element: <NotImplementedScreen what="Тропа пройдена" /> },
]
