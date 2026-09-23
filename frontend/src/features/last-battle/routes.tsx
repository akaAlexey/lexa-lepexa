import type { RouteObject } from 'react-router'
import { NotImplementedScreen } from '../../app/NotImplementedScreen.tsx'
import { LastBattleScreen } from './LastBattleScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'last-battle', element: <LastBattleScreen /> },
  { path: 'last-battle/new', element: <NotImplementedScreen what="Отметить место гибели" /> },
  { path: 'last-battle/:siteId', element: <NotImplementedScreen what="Место гибели" /> },
]
