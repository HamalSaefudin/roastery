import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboardIcon,
  ShoppingCartIcon,
  PackageIcon,
  WarehouseIcon,
  BadgePercentIcon,
  UsersIcon,
  TruckIcon,
  WrenchIcon,
  FileTextIcon,
  ChevronDownIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from 'lucide-react'
import { cn } from '#/lib/utils'
import { Button } from '../ui/button'

interface MenuItem {
  label: string
  path?: string
  icon?: typeof LayoutDashboardIcon
  children?: Array<{ label: string; path: string }>
}

const MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboardIcon },
  { label: 'Pesanan', path: '/pesanan', icon: ShoppingCartIcon },
  {
    label: 'Katalog',
    icon: PackageIcon,
    children: [
      { label: 'Produk', path: '/katalog' },
      { label: 'Brand', path: '/katalog/brands' },
      { label: 'Origin', path: '/katalog/origins' },
      { label: 'Kategori', path: '/katalog/categories' },
    ],
  },
  {
    label: 'Stok',
    icon: WarehouseIcon,
    children: [
      { label: 'Biji', path: '/stok/biji' },
      { label: 'Unit', path: '/stok/unit' },
      { label: 'Riwayat', path: '/stok/riwayat' },
    ],
  },
  {
    label: 'Harga & Promo',
    icon: BadgePercentIcon,
    children: [
      { label: 'Harga', path: '/harga-promo' },
      { label: 'Tier Grosir', path: '/harga-promo/tier' },
      { label: 'Kode Promo', path: '/harga-promo/promo' },
    ],
  },
  { label: 'Pelanggan', path: '/pelanggan', icon: UsersIcon },
  {
    label: 'Pengiriman',
    icon: TruckIcon,
    children: [
      { label: 'Papan Dispatch', path: '/pengiriman' },
      { label: 'Zona', path: '/pengiriman/zona' },
      { label: 'Driver', path: '/pengiriman/driver' },
      { label: 'Kendaraan', path: '/pengiriman/kendaraan' },
      { label: 'Setoran COD', path: '/pengiriman/cod' },
    ],
  },
  {
    label: 'Service Desk',
    icon: WrenchIcon,
    children: [
      { label: 'Garansi', path: '/service-desk' },
      { label: 'Tiket Servis', path: '/service-desk/tiket' },
    ],
  },
  { label: 'Konten', path: '/konten', icon: FileTextIcon },
]

function usePathname() {
  return useLocation().pathname
}

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()

  function isActive(path: string) {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  function isExactActive(path: string) {
    return pathname === path
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <span className="font-heading text-sm font-bold tracking-wider text-sidebar-primary">
            ROASTERY
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-4" />
          ) : (
            <PanelLeftCloseIcon className="size-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {MENU.map((item) => (
            <SidebarItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              isActive={item.path ? isActive(item.path) : false}
              isExactActive={isExactActive}
            />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function SidebarItem({
  item,
  collapsed,
  isActive: active,
  isExactActive,
}: {
  item: MenuItem
  collapsed: boolean
  isActive: boolean
  isExactActive: (path: string) => boolean
}) {
  const [open, setOpen] = useState(active)
  const hasChildren = item.children && item.children.length > 0
  const Icon = item.icon

  if (collapsed) {
    return (
      <li>
        {item.path ? (
          <Link
            to={item.path}
            className={cn(
              'flex h-10 items-center justify-center rounded-md text-sm transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
            title={item.label}
          >
            {Icon && <Icon className="size-5 shrink-0" />}
          </Link>
        ) : (
          <div
            className="flex h-10 cursor-default items-center justify-center rounded-md text-sidebar-foreground"
            title={item.label}
          >
            {Icon && <Icon className="size-5 shrink-0" />}
          </div>
        )}
      </li>
    )
  }

  if (!hasChildren) {
    return (
      <li>
        <Link
          to={item.path}
          className={cn(
            'flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
            active
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          <span>{item.label}</span>
        </Link>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        {Icon && <Icon className="size-4 shrink-0" />}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDownIcon
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
          {item.children!.map((child) => (
            <li key={child.path}>
              <Link
                to={child.path}
                className={cn(
                  'flex h-8 items-center rounded-md px-3 text-sm transition-colors',
                  isExactActive(child.path)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
