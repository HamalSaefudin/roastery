import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

// Placeholder — halaman login & dashboard dibangun di step 02-03
function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold text-primary">☕ Roastery CMS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fondasi UI terpasang — login menyusul di step 02.
        </p>
      </div>
    </div>
  )
}
