import type { RouteObject } from 'react-router'
import { SearchScreen } from './SearchScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [{ path: 'search', element: <SearchScreen /> }]
