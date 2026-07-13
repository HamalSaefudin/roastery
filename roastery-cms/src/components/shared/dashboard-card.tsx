import type { LucideIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { RotateCwIcon } from 'lucide-react'
import type { QueryObserverResult } from '@tanstack/react-query'
import { cn } from '#/lib/utils'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

interface DashboardCardProps {
  judul: string
  ikon: LucideIcon
  /** Base path tujuan saat diklik */
  href: string
  /** Search params tambahan, mis. { status: 'created' } */
  search?: Record<string, string>
  queryResult: Pick<
    QueryObserverResult<number>,
    'data' | 'isLoading' | 'isError' | 'refetch' | 'isRefetching'
  >
}

export function DashboardCard({
  judul,
  ikon: Ikon,
  href,
  search,
  queryResult,
}: DashboardCardProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch, isRefetching } = queryResult

  function handleClick() {
    navigate({ to: href as never, search: search as never })
  }

  return (
    <Card
      className={cn(
        'group cursor-pointer p-4 transition-colors hover:bg-accent',
        (isLoading || isError) && 'cursor-default',
      )}
      onClick={!isLoading && !isError ? handleClick : undefined}
      role={!isLoading && !isError ? 'button' : undefined}
      tabIndex={!isLoading && !isError ? 0 : undefined}
      onKeyDown={
        !isLoading && !isError
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') handleClick()
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{judul}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : isError ? (
            <div className="flex items-center gap-2">
              <span className="font-heading text-2xl font-bold text-muted-foreground">
                &mdash;
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  refetch()
                }}
                disabled={isRefetching}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Coba lagi"
              >
                <RotateCwIcon
                  className={cn('size-3.5', isRefetching && 'animate-spin')}
                />
              </button>
            </div>
          ) : (
            <p className="font-heading text-2xl font-bold">{data ?? 0}</p>
          )}
        </div>
        <Ikon className="size-8 text-muted-foreground/40" />
      </div>
    </Card>
  )
}
