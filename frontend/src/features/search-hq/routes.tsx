import type { RouteObject } from 'react-router'
import { NotImplementedScreen } from '../../app/NotImplementedScreen.tsx'
import { SearchScreen } from './SearchScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'search', element: <SearchScreen /> },
  { path: 'search/requests/new', element: <NotImplementedScreen what="Новая заявка" /> },
]
