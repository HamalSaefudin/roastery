import { ConstructionIcon } from 'lucide-react'

export function PlaceholderPage({ judul }: { judul: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ConstructionIcon className="size-12 text-muted-foreground" />
      <div>
        <p className="font-heading text-xl font-semibold">{judul}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman ini akan segera tersedia.
        </p>
      </div>
    </div>
  )
}
