import type { RouteObject } from 'react-router'
import { LastBattleScreen } from './LastBattleScreen.tsx'
import { NewSiteScreen } from './NewSiteScreen.tsx'
import { SiteScreen } from './SiteScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'last-battle', element: <LastBattleScreen /> },
  { path: 'last-battle/new', element: <NewSiteScreen /> },
  { path: 'last-battle/:siteId', element: <SiteScreen /> },
]
