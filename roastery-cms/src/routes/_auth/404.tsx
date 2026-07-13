import { createFileRoute } from '@tanstack/react-router'
import { FileQuestionIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_auth/404')({
  component: NotFoundPage,
})

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <FileQuestionIcon className="size-16 text-muted-foreground" />
      <div>
        <p className="font-heading text-3xl font-bold">404</p>
        <p className="mt-1 text-muted-foreground">
          Halaman yang Anda cari tidak ditemukan.
        </p>
      </div>
      <Button asChild>
        <a href="/">Kembali ke Dashboard</a>
      </Button>
    </div>
  )
}
