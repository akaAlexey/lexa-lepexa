import { useQuery } from '@tanstack/react-query'
import { useServices } from '../../app/services.tsx'

export const livePhotosKey = ['live-photos'] as const
export const livePhotoKey = (id: string) => ['live-photos', id] as const

/** Ассеты лежат в public/live; на GitHub Pages приложение живёт не в корне — учитываем BASE_URL. */
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const livePhotoUrl = (id: string) => `/live/${id}`

/** Этическая оговорка из кейса — показывается до просмотра и остаётся на экране камеры. */
export const ETHICS_NOTE =
  'Технология применяется только для мемориальных целей, с уважением к памяти. Запрещено коммерческое использование или изменение смысла высказывания.'

export function useLivePhotos() {
  const { api } = useServices()
  return useQuery({ queryKey: livePhotosKey, queryFn: api.listLivePhotos })
}
