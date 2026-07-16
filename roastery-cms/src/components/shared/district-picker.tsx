import { useQuery } from '@tanstack/react-query'
import { XIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Input } from '#/components/ui/input.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { regionSearchQueryOptions } from '#/features/regions/queries.ts'

export interface DistrictOption {
  code: string
  name: string
}

interface DistrictPickerProps {
  value: DistrictOption[]
  onChange: (value: DistrictOption[]) => void
}

/** Search async kecamatan (GET /regions/search?level=district) → multi-select chip removable. */
export function DistrictPicker({ value, onChange }: DistrictPickerProps) {
  const [q, setQ] = useState('')
  const { data: results, isLoading } = useQuery(
    regionSearchQueryOptions(q, 'district'),
  )

  function add(opt: DistrictOption) {
    if (value.some((v) => v.code === opt.code)) return
    onChange([...value, opt])
    setQ('')
  }

  function remove(code: string) {
    onChange(value.filter((v) => v.code !== code))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kecamatan…"
          className="pl-8"
        />
        {q.trim().length >= 2 && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            {isLoading && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Mencari…
              </p>
            )}
            {!isLoading && (results ?? []).length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Tidak ditemukan
              </p>
            )}
            {(results ?? []).map((r) => (
              <button
                key={r.code}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => add({ code: r.code, name: r.name })}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge key={v.code} variant="secondary" className="gap-1 py-1">
              {v.name}
              <button
                type="button"
                onClick={() => remove(v.code)}
                aria-label={`Hapus ${v.name}`}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
