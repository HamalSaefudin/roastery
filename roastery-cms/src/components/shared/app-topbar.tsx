import { useLocation, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronRightIcon, LogOutIcon } from 'lucide-react'
import { LoadingButton } from './loading-button'
import { ThemeToggle } from './theme-toggle'
import { StatusBadge } from './status-badge'
import { meQueryOptions, useLogoutMutation } from '#/features/auth/queries'
import { toastError } from '#/lib/toast'

const TITLE_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/pesanan': 'Pesanan',
  '/katalog': 'Produk',
  '/katalog/brands': 'Brand',
  '/katalog/origins': 'Origin',
  '/katalog/categories': 'Kategori',
  '/stok': 'Stok',
  '/harga-promo': 'Harga & Promo',
  '/pelanggan': 'Pelanggan',
  '/pengiriman': 'Papan Dispatch',
  '/pengiriman/zona': 'Zona',
  '/pengiriman/driver': 'Driver',
  '/pengiriman/kendaraan': 'Kendaraan',
  '/pengiriman/cod': 'Setoran COD',
  '/service-desk': 'Garansi',
  '/service-desk/tiket': 'Tiket Servis',
  '/konten': 'Konten',
}

function useBreadcrumbs() {
  const pathname = useLocation().pathname
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: Array<{ label: string; path: string }> = [
    { label: 'Dashboard', path: '/' },
  ]
  let current = ''
  for (const part of parts) {
    current += '/' + part
    const label = TITLE_MAP[current] ?? part
    crumbs.push({ label, path: current })
  }
  return crumbs
}

export function AppTopbar() {
  const crumbs = useBreadcrumbs()
  const navigate = useNavigate()
  const { data: user } = useSuspenseQuery(meQueryOptions())
  const logoutMutation = useLogoutMutation()

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync()
    } catch (err) {
      toastError(err)
    } finally {
      await navigate({ to: '/login' })
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0" />}
            {i < crumbs.length - 1 ? (
              <a
                href={crumb.path}
                className="transition-colors hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault()
                  navigate({ to: crumb.path })
                }}
              >
                {crumb.label}
              </a>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1">
          <span className="max-w-32 truncate text-sm text-muted-foreground">
            {user.email}
          </span>
          <StatusBadge jenis="user" status={user.role} />
        </div>
        <LoadingButton
          variant="ghost"
          size="icon"
          loading={logoutMutation.isPending}
          onClick={handleLogout}
          aria-label="Keluar"
        >
          <LogOutIcon className="size-4" />
        </LoadingButton>
      </div>
    </header>
  )
}
