import { Navigate, type RouteObject } from 'react-router'
import { paths, patterns } from '../../functions/core/paths.ts'
import { NewSiteScreen } from './NewSiteScreen.tsx'
import { SiteScreen } from './SiteScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  // Отдельного экрана «Последний бой» больше нет: места поиска — на «Карте»
  { path: patterns.lastBattle, element: <Navigate to={paths.map()} replace /> },
  { path: patterns.newSite, element: <NewSiteScreen /> },
  { path: patterns.site, element: <SiteScreen /> },
]
