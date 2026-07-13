import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { CatchBoundary, useLocation } from '@tanstack/react-router'
import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'
import { ErrorState } from './error-state'

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sidebar-collapsed', String(next))
      } catch {}
      return next
    })
  }, [])

  return { collapsed, toggle }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { collapsed, toggle } = useCollapsed()
  const location = useLocation()

  return (
    <div className="flex h-screen">
      <AppSidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          <CatchBoundary
            getResetKey={() => location.pathname}
            errorComponent={({ error }) => (
              <ErrorState
                error={error}
                pesan="Terjadi kesalahan. Silakan coba lagi."
              />
            )}
          >
            {children}
          </CatchBoundary>
        </main>
      </div>
    </div>
  )
}
