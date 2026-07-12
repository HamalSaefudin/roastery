import { useEffect } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { Toaster } from '../components/ui/sonner'
import { SessionWatcher } from '../components/shared/session-watcher'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

// Baca preferensi tema SEBELUM paint supaya tidak flash (FOUC).
// Default dark (identitas design system Dark Roast).
const temaInitScript = `try{var t=localStorage.getItem('tema');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Roastery CMS',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Penanda hydration selesai — dipakai e2e Playwright utk menunggu sebelum
  // berinteraksi (klik ke tombol SSR sebelum hydrate = handler belum terpasang)
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])

  return (
    // data-theme di-set ulang oleh temaInitScript sebelum paint (localStorage) —
    // mismatch atribut ini disengaja, makanya suppressHydrationWarning
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: temaInitScript }} />
      </head>
      <body>
        {children}
        <SessionWatcher />
        <Toaster />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
