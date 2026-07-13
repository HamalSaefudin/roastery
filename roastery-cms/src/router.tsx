import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'
import { PageSkeleton } from './components/shared/skeletons'
import { FileQuestionIcon } from 'lucide-react'
import { Button } from './components/ui/button'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PageSkeleton,
    defaultNotFoundComponent: () => (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <FileQuestionIcon className="size-16 text-muted-foreground" />
        <div>
          <p className="font-heading text-3xl font-bold">404</p>
          <p className="mt-1 text-muted-foreground">Halaman tidak ditemukan.</p>
        </div>
        <Button asChild>
          <a href="/">Kembali ke Dashboard</a>
        </Button>
      </div>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
