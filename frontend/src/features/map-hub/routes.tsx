import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { MapHubScreen } from './MapHubScreen.tsx'

export const routes: RouteObject[] = [{ path: patterns.map.slice(1), element: <MapHubScreen /> }]
