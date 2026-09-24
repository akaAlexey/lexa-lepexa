import type { RouteObject } from 'react-router'
import { LivePhotoListScreen } from './LivePhotoListScreen.tsx'
import { LivePhotoScreen } from './LivePhotoScreen.tsx'
import { NewLivePhotoScreen } from './NewLivePhotoScreen.tsx'

/** Маршруты модуля. /live/:photoId — адрес из QR-кода на снимке. */
export const routes: RouteObject[] = [
  { path: 'live', element: <LivePhotoListScreen /> },
  { path: 'live/new', element: <NewLivePhotoScreen /> },
  { path: 'live/:photoId', element: <LivePhotoScreen /> },
]
