import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider, type createBrowserRouter } from 'react-router'
import { useAccountSync } from '../functions/account/useAccountSync.ts'
import { RoleProvider } from './RoleContext.tsx'
import { ServicesProvider, type Services } from './services.tsx'

interface Props {
  services: Services
  router: ReturnType<typeof createBrowserRouter>
}

export function App({ services, router }: Props) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  )
  return (
    <ServicesProvider value={services}>
      <QueryClientProvider client={queryClient}>
        <AccountSync />
        <RoleProvider>
          <RouterProvider router={router} />
        </RoleProvider>
      </QueryClientProvider>
    </ServicesProvider>
  )
}

/** Личное состояние вошедшего пользователя — общее для всех его устройств (сервер входа). */
function AccountSync() {
  useAccountSync()
  return null
}
