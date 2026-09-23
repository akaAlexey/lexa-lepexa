import type { RouteObject } from 'react-router'
import { NotImplementedScreen } from '../../app/NotImplementedScreen.tsx'
import { WeekendsScreen } from './WeekendsScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'weekends', element: <WeekendsScreen /> },
  { path: 'weekends/:tripId', element: <NotImplementedScreen what="Выезд" /> },
]
