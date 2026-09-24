import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider, type createBrowserRouter } from 'react-router'
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
        <RoleProvider>
          <RouterProvider router={router} />
        </RoleProvider>
      </QueryClientProvider>
    </ServicesProvider>
  )
}
