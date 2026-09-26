import { useDeps } from './useDeps.ts'

/** Связь с сервером: false — приложение запустилось без сервера и работает на встроенных данных. */
export function useServerConnected(): boolean {
  return !useDeps().api.offline
}
