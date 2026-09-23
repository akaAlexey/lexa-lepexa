import type { RouteObject } from 'react-router'
import { LastBattleScreen } from './LastBattleScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [{ path: 'last-battle', element: <LastBattleScreen /> }]
