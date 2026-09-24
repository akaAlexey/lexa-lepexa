import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Team, VolunteerRequest } from '../../contract/schemas.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useForm, type FormState } from '../core/useForm.ts'
import {
  publishRequest,
  requestDates,
  requestForm,
  withPublished,
  type RequestValues,
} from './publishRequest.ts'

/**
 * Форма заявки командира: значения по прошлой заявке, проверка правилами domain/requests,
 * публикация и обновление ленты. `onPublished` — вернуться на ленту (роутер — забота экрана).
 */
export function usePublishRequest(
  team: Team,
  last: VolunteerRequest | undefined,
  onPublished: (created: VolunteerRequest) => void,
): FormState<RequestValues> & { today: string; tomorrow: string } {
  const deps = useDeps()
  const queryClient = useQueryClient()
  // даты считаются один раз при открытии формы — полночь не меняет варианты под рукой
  const [dates] = useState(() => requestDates(deps.now()))
  const form = useForm(requestForm, { team, last, ...dates }, async (request) => {
    const created = await publishRequest(deps, request)
    queryClient.setQueryData<VolunteerRequest[]>(qk.requests, (old) => withPublished(old, created))
    void queryClient.invalidateQueries({ queryKey: qk.requests })
    onPublished(created)
  })
  return { ...form, ...dates }
}
