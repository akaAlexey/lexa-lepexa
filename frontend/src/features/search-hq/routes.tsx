import { Navigate, type RouteObject } from 'react-router'
import { paths, patterns } from '../../functions/core/paths.ts'
import { SignedInOnly } from '../live-photo/SignedInOnly.tsx'
import { NewRequestScreen } from './NewRequestScreen.tsx'

/**
 * Маршруты модуля. Экран «Поисковикам» убран (решение команды 25.09): заявки и сборы — в ленте
 * «Мероприятия», старый адрес /search ведёт туда же с фильтром заявок.
 */
export const routes: RouteObject[] = [
  { path: patterns.search, element: <Navigate to={paths.events('request')} replace /> },
  {
    path: patterns.newRequest,
    element: (
      <SignedInOnly>
        <NewRequestScreen />
      </SignedInOnly>
    ),
  },
]
