import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { OtherScreen } from './OtherScreen.tsx'

export const routes: RouteObject[] = [{ path: patterns.other.slice(1), element: <OtherScreen /> }]
