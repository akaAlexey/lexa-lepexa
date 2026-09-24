import { useCallback, useState } from 'react'
import { readAsDataUrl } from '../../platform/index.ts'
import { memory } from '../core/deviceMemory.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'

/** Сколько фото можно приложить к истории: больше не помещается в память телефона. */
export const MAX_STORY_IMAGES = 6

export interface StoryImage {
  src: string
  caption: string
}

/**
 * Фото к истории (ADR 0011). Пока бэкенд не принимает файлы, фото живут на устройстве автора:
 * уменьшаются до экрана телефона и сохраняются рядом с историей.
 */
export function useStoryImages(storyId: string) {
  const { platform } = useDeps()
  const [images, setImages] = useDeviceMemory(memory.storyImages(storyId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const add = useCallback(
    async (files: readonly File[]) => {
      setError(undefined)
      const pictures = files.filter((f) => f.type.startsWith('image/'))
      if (pictures.length < files.length) setError('Можно добавить только изображения.')
      const room = MAX_STORY_IMAGES - images.length
      if (room <= 0) {
        setError(`Не больше ${MAX_STORY_IMAGES} фото к одной истории.`)
        return
      }
      setBusy(true)
      try {
        const prepared = await Promise.all(
          pictures
            .slice(0, room)
            .map((f) => (platform.images ? platform.images.prepare(f) : readAsDataUrl(f))),
        )
        setImages((prev) => [...prev, ...prepared.map((src) => ({ src, caption: '' }))])
        if (pictures.length > room)
          setError(`Добавлены первые ${room}: не больше ${MAX_STORY_IMAGES} фото.`)
      } catch {
        setError('Не удалось сохранить фото: на устройстве не хватает места или файл повреждён.')
      } finally {
        setBusy(false)
      }
    },
    [images.length, platform.images, setImages],
  )

  const remove = useCallback(
    (index: number) => setImages((prev) => prev.filter((_, i) => i !== index)),
    [setImages],
  )

  const caption = useCallback(
    (index: number, text: string) =>
      setImages((prev) => prev.map((img, i) => (i === index ? { ...img, caption: text } : img))),
    [setImages],
  )

  return { images, busy, error, add, remove, caption, max: MAX_STORY_IMAGES }
}
