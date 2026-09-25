import { type RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { NewSiteScreen } from './NewSiteScreen.tsx'
import { LastBattleScreen } from './LastBattleScreen.tsx'
import { SiteScreen } from './SiteScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: patterns.lastBattle, element: <LastBattleScreen /> },
  { path: patterns.newSite, element: <NewSiteScreen /> },
  { path: patterns.site, element: <SiteScreen /> },
]
