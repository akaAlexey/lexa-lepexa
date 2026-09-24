import { paths } from '../../functions/core/paths.ts'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '../../app/services.tsx'

export const livePhotosKey = ['live-photos'] as const
export const livePhotoKey = (id: string) => ['live-photos', id] as const

/** Ассеты лежат в public/live; на GitHub Pages приложение живёт не в корне — учитываем BASE_URL. */
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const livePhotoUrl = (id: string) => paths.livePhoto(id)

/** Этическая оговорка из кейса — показывается до просмотра и остаётся на экране камеры. */
export const ETHICS_NOTE =
  'Технология применяется только для мемориальных целей, с уважением к памяти. Запрещено коммерческое использование или изменение смысла высказывания.'

/** Слова от первого лица из текста кейса (задача 7). */
export const CASE_PHRASE = 'Я сделал это, чтобы ты жил и видел голубое небо. Помни меня.'

export function useLivePhotos() {
  const { api } = useServices()
  return useQuery({ queryKey: livePhotosKey, queryFn: api.listLivePhotos })
}
