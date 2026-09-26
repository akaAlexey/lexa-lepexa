import { useEffect } from 'react'
import { isObserved, startAccountSync } from './accountSync.ts'
import { memory } from '../core/deviceMemory.ts'
import { useDeps } from '../core/useDeps.ts'
import { notifyMemory, useDeviceMemory } from '../core/useDeviceMemory.ts'

/**
 * Пока пользователь вошёл через сервер — личное состояние (профиль, записи, «мои» истории, прогресс)
 * общее для всех его устройств: приходит из аккаунта, изменения уходят на сервер.
 */
export function useAccountSync() {
  const { api, platform } = useDeps()
  const [account] = useDeviceMemory(memory.account)
  const accountId = api.auth ? account?.id : undefined
  useEffect(() => {
    const storage = platform.storage
    if (!accountId || !isObserved(storage)) return
    return startAccountSync({
      api,
      storage,
      accountId,
      notify: (key) => notifyMemory(storage, key),
    })
  }, [api, platform, accountId])
}
