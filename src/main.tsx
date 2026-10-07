import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/router'
import '@fontsource-variable/roboto-mono'
import '@/index.css'

async function bootstrap() {
  // Start MSW in development
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('@/mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  })

  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

bootstrap()
