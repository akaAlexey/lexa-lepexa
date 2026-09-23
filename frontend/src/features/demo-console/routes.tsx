import type { RouteObject } from 'react-router'
import { DemoConsoleScreen } from './DemoConsoleScreen.tsx'

/** Скрытый демо-пульт: не в меню, открывается по адресу /demo. */
export const routes: RouteObject[] = [{ path: 'demo', element: <DemoConsoleScreen /> }]
