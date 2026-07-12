import { useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '../ui/button'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

function getTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function ThemeToggle() {
  const tema = useSyncExternalStore(subscribe, getTheme, () => 'dark')

  function toggle() {
    const next = tema === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('tema', next)
    } catch {
      // localStorage bisa gagal (private mode) — tema tetap berubah utk sesi ini
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={
        tema === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'
      }
    >
      {tema === 'dark' ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </Button>
  )
}
