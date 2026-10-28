import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/format'

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
  right,
}: {
  label?: string
  hint?: ReactNode
  error?: ReactNode
  htmlFor?: string
  required?: boolean
  children: ReactNode
  className?: string
  right?: ReactNode
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="flex items-center gap-1 text-[11.5px] font-medium text-mist-300">
            {label}
            {required ? <span className="text-danger">*</span> : null}
          </label>
          {right}
        </div>
      ) : null}
      {children}
      {error ? <div className="mt-1.5 text-[11px] text-danger">{error}</div> : null}
      {!error && hint ? <div className="mt-1.5 text-[11px] leading-4 text-mist-500">{hint}</div> : null}
    </div>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('field', className)} {...props} />
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  id,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn('field', className)}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  placeholder = '待核实',
  disabled,
  className,
  id,
  autoFocus,
}: {
  value: number | null
  onChange: (value: number | null) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  autoFocus?: boolean
}) {
  const [text, setText] = useState(value === null ? '' : String(value))
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) setText(value === null ? '' : String(value))
  }, [value, focused])

  const commit = (raw: string) => {
    const cleaned = raw.replace(/,/g, '').trim()
    if (cleaned === '') {
      onChange(null)
      return
    }
    const parsed = Number(cleaned)
    if (!Number.isFinite(parsed)) return
    let next = parsed
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    onChange(next)
  }

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      disabled={disabled}
      value={text}
      placeholder={placeholder}
      className={cn('field num', unit && 'pr-14', className)}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const raw = event.target.value
        if (raw !== '' && !/^-?\d*\.?\d*$/.test(raw)) return
        setText(raw)
        if (raw !== '' && !raw.endsWith('.') && !raw.endsWith('-')) {
          const parsed = Number(raw)
          if (Number.isFinite(parsed)) {
            let next = parsed
            if (min !== undefined) next = Math.max(min, next)
            if (max !== undefined) next = Math.min(max, next)
            onChange(next)
          }
        }
      }}
      onBlur={() => {
        setFocused(false)
        commit(text)
        setText((prev) => {
          if (prev === '') return ''
          const n = Number(prev)
          return Number.isFinite(n) ? String(n) : ''
        })
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
      }}
    />
  )

  if (!unit) return input
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-mist-500">{unit}</span>
    </div>
  )
}

export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = '待核实',
  step = 0.01,
}: {
  value: number | null
  onChange: (yuan: number | null) => void
  className?: string
  placeholder?: string
  step?: number
}) {
  return (
    <NumberInput
      value={value === null ? null : Number((value / 10000).toFixed(4))}
      onChange={(wan) => onChange(wan === null ? null : Math.round(wan * 10000))}
      step={step}
      min={0}
      unit="万元"
      placeholder={placeholder}
      className={className}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line/80 bg-white/[0.015] px-3.5 py-3 text-left transition hover:border-line-strong disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-mist-200">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] leading-4 text-mist-500">{description}</span> : null}
      </span>
      <span
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition',
          checked ? 'border-accent/60 bg-accent/25' : 'border-line-strong bg-white/[0.04]',
        )}
      >
        <span
          className={cn(
            'ml-0.5 size-3.5 rounded-full transition-transform',
            checked ? 'translate-x-4 bg-accent' : 'translate-x-0 bg-mist-400',
          )}
        />
      </span>
    </button>
  )
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  hint,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
  hint?: string
  format?: (value: number) => string
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11.5px] font-medium text-mist-300">{label}</span>
        <span className="num text-xs font-semibold text-accent">
          {format ? format(value) : `${value.toLocaleString('zh-CN')}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
      {hint ? <div className="mt-1.5 text-[10.5px] leading-4 text-mist-500">{hint}</div> : null}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string; icon?: ReactNode }>
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-line/80 bg-ink-900/60 p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-[9px] font-medium transition',
            size === 'sm' ? 'h-7 px-2.5 text-[11px]' : 'h-8 px-3 text-xs',
            value === option.value
              ? 'bg-ink-700 text-mist-100 shadow-sm'
              : 'text-mist-500 hover:text-mist-200',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ id: T; label: string; icon?: ReactNode; count?: number }>
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-line/70', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition',
            value === tab.id ? 'text-accent' : 'text-mist-500 hover:text-mist-200',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined ? (
            <span className="num rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-mist-400">{tab.count}</span>
          ) : null}
          {value === tab.id ? <span className="absolute inset-x-2 -bottom-px h-px bg-accent" /> : null}
        </button>
      ))}
    </div>
  )
}
