import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/format'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-ink-950 hover:bg-[#7df3df] shadow-[0_10px_30px_-12px_rgba(94,234,212,.55)] border border-accent/60',
  secondary:
    'bg-ink-750 text-mist-100 border border-line-strong hover:border-[#3b516d] hover:bg-ink-700',
  ghost: 'text-mist-300 hover:text-mist-100 hover:bg-white/[0.045] border border-transparent',
  danger:
    'bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger/50',
  outline:
    'border border-line-strong text-mist-200 hover:border-accent/40 hover:text-accent bg-transparent',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[13px] gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className={size === 'xs' || size === 'sm' ? 'size-3.5' : 'size-4'} /> : null}
      {children}
      {IconRight ? <IconRight className={size === 'xs' || size === 'sm' ? 'size-3.5' : 'size-4'} /> : null}
    </button>
  )
})

export function IconButton({
  label,
  icon: Icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: LucideIcon }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-mist-400 transition hover:border-line-strong hover:bg-white/[0.04] hover:text-mist-100',
        className,
      )}
      {...props}
    >
      <Icon className="size-4" />
    </button>
  )
}

type BadgeTone = 'teal' | 'blue' | 'amber' | 'rose' | 'violet' | 'neutral' | 'lime'

const BADGE_TONES: Record<BadgeTone, string> = {
  teal: 'border-teal-300/25 bg-teal-300/10 text-teal-200',
  blue: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
  amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  rose: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
  violet: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
  neutral: 'border-line-strong/80 bg-white/[0.025] text-mist-400',
  lime: 'border-lime-300/25 bg-lime-300/10 text-lime-200',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot = false,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-4 whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  )
}

export function InfoTip({ children, text, side = 'bottom', align = 'center' }: { children?: ReactNode; text: ReactNode; side?: 'top' | 'bottom'; align?: 'left' | 'center' | 'right' }) {
  return (
    <span className="group relative inline-flex items-center">
      {children ?? (
        <button
          type="button"
          aria-label="查看说明"
          className="inline-flex size-4 items-center justify-center rounded-full text-mist-500 transition hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          tabIndex={0}
        >
          <Info className="size-3.5" />
        </button>
      )}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 w-60 rounded-xl border border-line-strong bg-ink-800/98 px-3 py-2.5 text-left text-[11.5px] font-normal leading-5 text-mist-300 opacity-0 shadow-2xl backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
          align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2',
          side === 'bottom' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]',
        )}
      >
        {text}
      </span>
    </span>
  )
}

export function ProgressBar({
  value,
  tone = 'teal',
  className,
  height = 'h-1.5',
}: {
  value: number
  tone?: 'teal' | 'blue' | 'amber' | 'rose'
  className?: string
  height?: string
}) {
  const tones = {
    teal: 'from-teal-300 to-cyan-400',
    blue: 'from-sky-400 to-blue-500',
    amber: 'from-amber-300 to-orange-400',
    rose: 'from-rose-400 to-pink-500',
  }
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-white/[0.055]', height, className)}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-500', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  )
}

export function SectionTitle({
  title,
  description,
  action,
  eyebrow,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  eyebrow?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="label mb-1.5">{eyebrow}</div> : null}
        <h2 className="text-[17px] font-semibold tracking-tight text-mist-100">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-xs leading-5 text-mist-400">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-line/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="display text-[28px] font-semibold text-mist-100 sm:text-[32px]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-[13px] leading-6 text-mist-400">{subtitle}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong/80 bg-white/[0.012] px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line-strong bg-ink-750 text-mist-400">
        <Icon className="size-5" />
      </div>
      <h3 className="text-sm font-semibold text-mist-200">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-mist-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function KeyValue({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="label mb-1.5">{label}</div>
      <div className="num truncate text-[15px] font-medium text-mist-100">{value}</div>
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('hairline', className)} />
}
