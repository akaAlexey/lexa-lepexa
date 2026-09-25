import { Navigate, type RouteObject } from 'react-router'
import { paths, patterns } from '../../functions/core/paths.ts'
import { GroupApplicationScreen } from './GroupApplicationScreen.tsx'
import { TripScreen } from './TripScreen.tsx'
import { SignedInOnly } from '../live-photo/SignedInOnly.tsx'

/**
 * Маршруты модуля. Список выездов убран (решение команды 25.09): выезды — в ленте «Мероприятия»
 * с фильтром, старый адрес /weekends из ссылок и QR-кодов ведёт туда же.
 */
export const routes: RouteObject[] = [
  { path: patterns.weekends, element: <Navigate to={paths.events('trip')} replace /> },
  { path: patterns.trip, element: <TripScreen /> },
  {
    path: patterns.tripGroup,
    element: (
      <SignedInOnly>
        <GroupApplicationScreen />
      </SignedInOnly>
    ),
  },
]
