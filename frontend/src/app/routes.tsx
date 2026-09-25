import type { RouteObject } from 'react-router'
import { routes as archive } from '../features/archive/routes.tsx'
import { routes as chronicle } from '../features/chronicle/routes.tsx'
import { routes as demoConsole } from '../features/demo-console/routes.tsx'
import { routes as events } from '../features/events/routes.tsx'
import { routes as lastBattle } from '../features/last-battle/routes.tsx'
import { routes as livePhoto } from '../features/live-photo/routes.tsx'
import { routes as mapHub } from '../features/map-hub/routes.tsx'
import { routes as other } from '../features/other/routes.tsx'
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
      ...mapHub,
      ...events,
      ...trail,
      ...searchHq,
      ...weekends,
      ...lastBattle,
      ...archive,
      ...chronicle,
      ...livePhoto,
      ...other,
      ...demoConsole,
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]
