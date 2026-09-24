import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { NewRequestScreen } from './NewRequestScreen.tsx'
import { SearchScreen } from './SearchScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: patterns.search, element: <SearchScreen /> },
  { path: patterns.newRequest, element: <NewRequestScreen /> },
]
