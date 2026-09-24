import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useForm, type FormState } from '../core/useForm.ts'
import { locate } from '../whereAmI/index.ts'
import { newPlaceForm, type NewPlaceContext, type NewPlaceValues } from './newPlaceForm.ts'
import { publishPlace, type PublishedPlace } from './places.ts'

/** Что не удалось: определить координаты или опубликовать место. */
export type NewPlaceProblem = 'locate' | 'publish'

export interface NewPlaceForm extends FormState<NewPlaceValues> {
  /** Последняя неудача; сбрасывается при новой попытке. */
  problem: NewPlaceProblem | null
  /** «Мои координаты»: подставить позицию устройства в поля. */
  fillMyPosition: () => Promise<void>
}

/**
 * Форма «Отметить место гибели»: шаблон экспедиции, проверка, публикация без уведомления
 * самому себе, обновление кэша. Переход на карточку делает экран в `onPublished`.
 */
export function useNewPlaceForm(
  position: NewPlaceContext,
  onPublished: (place: PublishedPlace) => void,
): NewPlaceForm {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [problem, setProblem] = useState<NewPlaceProblem | null>(null)

  const form = useForm(newPlaceForm, position, async (request) => {
    try {
      const published = await publishPlace(deps, request)
      queryClient.setQueryData(qk.site(published.site.id), published.site)
      void queryClient.invalidateQueries({ queryKey: qk.sites, exact: true })
      onPublished(published)
    } catch (error) {
      setProblem('publish')
      throw error
    }
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    setProblem(null)
    form.submit(event)
  }

  const fillMyPosition = async () => {
    setProblem(null)
    try {
      const p = await locate(deps)
      form.set('lat', String(p.lat))
      form.set('lon', String(p.lon))
    } catch {
      setProblem('locate')
    }
  }

  return { ...form, submit, problem, fillMyPosition }
}
