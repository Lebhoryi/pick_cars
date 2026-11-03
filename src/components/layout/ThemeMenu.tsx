import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { THEMES, applyTheme, loadTheme, saveTheme, type ThemeId } from '@/lib/theme'
import { cn } from '@/lib/format'

export function ThemeMenu({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeId>('deep')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initial = loadTheme()
    setTheme(initial)
    applyTheme(initial)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = THEMES.find((item) => item.id === theme) ?? THEMES[0]

  const pick = (id: ThemeId) => {
    setTheme(id)
    applyTheme(id)
    saveTheme(id)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="切换主题"
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border border-line/80 bg-white/[0.02] px-3 py-2 text-left transition hover:border-accent/40 hover:bg-white/[0.035]',
          open && 'border-accent/40',
        )}
      >
        <span className="flex size-5 items-center justify-center rounded-md border border-line-strong" style={{ background: current.surface }}>
          <span className="size-2 rounded-full" style={{ background: current.accent }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11.5px] font-medium text-mist-200">{current.name}</span>
          {compact ? null : <span className="block text-[9.5px] text-mist-500">{current.tone} · {current.desc}</span>}
        </span>
        <Palette className="size-3.5 text-mist-500" />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[276px] overflow-hidden rounded-xl border border-line-strong bg-ink-850 p-2 shadow-2xl animate-rise">
          <div className="px-1.5 pb-1.5 text-[9.5px] uppercase tracking-[0.16em] text-mist-500">主题</div>
          <div className="grid gap-1">
            {THEMES.map((item) => {
              const active = item.id === theme
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left transition',
                    active
                      ? 'border-accent/45 bg-accent/10'
                      : 'border-transparent hover:border-line-strong hover:bg-white/[0.03]',
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line/80" style={{ background: item.surface }}>
                    <span className="size-2.5 rounded-full" style={{ background: item.accent }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11.5px] font-medium text-mist-200">{item.name}</span>
                      <span className="text-[9px] text-mist-500">{item.tone}</span>
                    </span>
                    <span className="block truncate text-[9.5px] text-mist-500">{item.desc}</span>
                  </span>
                  {active ? <Check className="size-3.5 shrink-0 text-accent" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
