import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GroupApplication } from '../../contract/schemas.ts'
import { memory } from '../core/deviceMemory.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { useForm, type FormState } from '../core/useForm.ts'
import { groupApplicationForm, type GroupFormValues } from './form.ts'
import {
  addMyGroup,
  decideGroupApplication,
  listGroupApplications,
  replaceApplication,
  prependApplication,
  submitGroupApplication,
  type GroupDecision,
} from './groupApplications.ts'

/** Все заявки групп для экрана. */
export function useGroupApplications(): Loadable<GroupApplication[]> {
  const deps = useDeps()
  return useQuery({ queryKey: qk.groupApplications, queryFn: () => listGroupApplications(deps) })
}

/** Id заявок, поданных с этого устройства: без регистрации руководитель группы видит их статус. */
export function useMyGroups(): readonly string[] {
  return useDeviceMemory(memory.myGroups)[0]
}

/** Решение командира по заявке: после ответа сервера заявка обновляется в списке. */
export function useGroupDecision(id: string): {
  decide(status: GroupDecision): void
  busy: boolean
  failed: boolean
} {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (status: GroupDecision) => decideGroupApplication(deps, id, status),
    onSuccess: (updated) =>
      queryClient.setQueryData<GroupApplication[]>(qk.groupApplications, (list) =>
        replaceApplication(list, updated),
      ),
  })
  return { decide: mutation.mutate, busy: mutation.isPending, failed: mutation.isError }
}

/**
 * Форма заявки группы на выезд. После отправки заявка запоминается в «Моих заявках групп»,
 * попадает в начало списка, и вызывается `onSent` — экран уходит к списку выездов.
 */
export function useGroupApplicationForm(
  tripId: string,
  onSent: (created: GroupApplication) => void,
): FormState<GroupFormValues> {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [, setMine] = useDeviceMemory(memory.myGroups)
  return useForm(groupApplicationForm, { tripId }, async (request) => {
    const created = await submitGroupApplication(deps, request)
    setMine((ids) => addMyGroup(ids, created.id))
    queryClient.setQueryData<GroupApplication[]>(qk.groupApplications, (list) =>
      prependApplication(list, created),
    )
    onSent(created)
  })
}
