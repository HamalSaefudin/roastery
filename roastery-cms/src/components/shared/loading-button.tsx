import { Loader2Icon } from 'lucide-react'
import { Button } from '../ui/button'
import type { ComponentProps, ReactNode } from 'react'

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  /** true selama mutation pending — tombol otomatis disabled + spinner (anti double-submit) */
  loading: boolean
  /** Teks pengganti saat loading, mis. "Menyimpan…" — default: children tetap */
  loadingText?: ReactNode
}

export function LoadingButton({
  loading,
  loadingText,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading && <Loader2Icon className="size-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  )
}
