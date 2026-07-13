import { createFileRoute } from '@tanstack/react-router'
import { ShieldXIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_auth/403')({
  component: ForbiddenPage,
})

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ShieldXIcon className="size-16 text-bahaya" />
      <div>
        <p className="font-heading text-3xl font-bold">403</p>
        <p className="mt-1 text-muted-foreground">
          Anda tidak punya izin mengakses halaman ini.
        </p>
      </div>
      <Button asChild>
        <a href="/">Kembali ke Dashboard</a>
      </Button>
    </div>
  )
}
