import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SignupRequest, Trip } from '../../contract/schemas.ts'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { replaceTrip } from '../trips/index.ts'
import { signUp, type AgeStatus, type SignupTarget } from './signup.ts'

/** Записи этого устройства и возраст из профиля: экран решает, что показать на карточке. */
export function useSignups(): {
  age: AgeStatus
  isSignedUp: (target: SignupTarget) => boolean
} {
  const [joined] = useDeviceMemory(memory.joinedRequests)
  const [registered] = useDeviceMemory(memory.registeredTrips)
  const [age] = useDeviceMemory(memory.ageStatus)
  return {
    age,
    isSignedUp: (t) =>
      t.kind === 'request' ? joined.includes(t.request.id) : registered.includes(t.trip.id),
  }
}

/**
 * Запись из окна с условиями. После успеха: запись видна на всех карточках (память устройства),
 * заявка перечитывается, у выезда сразу меньше свободных мест.
 */
export function useSignUp(target: SignupTarget) {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [, setJoined] = useDeviceMemory(memory.joinedRequests)
  const [, setRegistered] = useDeviceMemory(memory.registeredTrips)
  return useMutation({
    mutationFn: (body: SignupRequest) => signUp(deps, target, body),
    onSuccess: (result) => {
      if (result.kind === 'request') {
        setJoined(result.joined)
        void queryClient.invalidateQueries({ queryKey: qk.requests })
        return
      }
      setRegistered(result.registered)
      queryClient.setQueryData(qk.trip(result.trip.id), result.trip)
      queryClient.setQueryData<Trip[]>(qk.trips, (list) => replaceTrip(list, result.trip))
    },
  })
}
