import type { RouteObject } from 'react-router'
import { NotImplementedScreen } from '../../app/NotImplementedScreen.tsx'

/** Скрытый демо-пульт: не в меню, открывается по адресу /demo. */
export const routes: RouteObject[] = [
  { path: 'demo', element: <NotImplementedScreen what="Демо-пульт" /> },
]
