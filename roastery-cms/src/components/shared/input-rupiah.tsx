import { Input } from '#/components/ui/input.tsx'
import { cn } from '#/lib/utils.ts'
import type { ComponentProps } from 'react'

interface InputRupiahProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type'
> {
  value: number | ''
  onChange: (nilai: number | '') => void
}

function formatDisplay(val: number): string {
  return val.toLocaleString('id-ID')
}

export function InputRupiah({
  value,
  onChange,
  className,
  ...props
}: InputRupiahProps) {
  const display = value === '' ? '' : formatDisplay(value)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    onChange(raw ? Number(raw) : '')
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className={cn('pl-9', className)}
      />
    </div>
  )
}
