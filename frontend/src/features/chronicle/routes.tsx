import type { RouteObject } from 'react-router'
import { ChronicleScreen } from './ChronicleScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [{ path: 'chronicle', element: <ChronicleScreen /> }]
