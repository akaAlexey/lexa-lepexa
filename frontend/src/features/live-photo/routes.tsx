import type { RouteObject } from 'react-router'
import { LivePhotoListScreen } from './LivePhotoListScreen.tsx'
import { LivePhotoScreen } from './LivePhotoScreen.tsx'
import { NewLivePhotoScreen } from './NewLivePhotoScreen.tsx'
import { SignedInOnly } from './SignedInOnly.tsx'

/** Маршруты модуля. /live/:photoId — адрес из QR-кода на снимке. Всё — только после входа. */
export const routes: RouteObject[] = [
  {
    path: 'live',
    element: (
      <SignedInOnly>
        <LivePhotoListScreen />
      </SignedInOnly>
    ),
  },
  {
    path: 'live/new',
    element: (
      <SignedInOnly>
        <NewLivePhotoScreen />
      </SignedInOnly>
    ),
  },
  {
    path: 'live/:photoId',
    element: (
      <SignedInOnly>
        <LivePhotoScreen />
      </SignedInOnly>
    ),
  },
]
