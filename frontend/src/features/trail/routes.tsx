import type { RouteObject } from 'react-router'
import { TrailScreen } from './TrailScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [{ path: 'trail', element: <TrailScreen /> }]
