import type { RouteObject } from 'react-router'
import { routes as demoConsole } from '../features/demo-console/routes.tsx'
import { routes as lastBattle } from '../features/last-battle/routes.tsx'
import { RolePickerScreen } from '../features/roles/RolePickerScreen.tsx'
import { routes as searchHq } from '../features/search-hq/routes.tsx'
import { routes as trail } from '../features/trail/routes.tsx'
import { routes as weekends } from '../features/weekends/routes.tsx'
import { Layout } from './Layout.tsx'
import { NotFoundScreen } from './NotFoundScreen.tsx'

/**
 * Карта URL. Каждый экран и каждая карточка — свой адрес: «Назад» работает, ссылкой можно поделиться.
 * Модули подключают свои маршруты из features/<модуль>/routes.tsx.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <RolePickerScreen /> },
      ...trail,
      ...searchHq,
      ...weekends,
      ...lastBattle,
      ...demoConsole,
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]
