import { useId } from 'react'
import { Star } from 'lucide-react'
import type { FocusStatus, Vehicle, Verification } from '@/types'
import { cn, getInitials } from '@/lib/format'
import { Badge } from '@/components/ui/primitives'

export const FOCUS_TONES: Record<FocusStatus, 'teal' | 'blue' | 'amber' | 'lime'> = {
  重点关注: 'teal',
  观察中: 'blue',
  暂时淘汰: 'amber',
  已购买: 'lime',
}

export function StatusBadge({ status, className }: { status: FocusStatus; className?: string }) {
  return (
    <Badge tone={FOCUS_TONES[status]} dot className={className}>
      {status}
    </Badge>
  )
}

const VERIFICATION_TONES: Record<Verification, 'teal' | 'blue' | 'violet' | 'lime' | 'amber' | 'neutral'> = {
  官方: 'teal',
  媒体: 'blue',
  经销商: 'violet',
  实测: 'lime',
  个人: 'amber',
  待核实: 'neutral',
}

export function VerificationBadge({
  status,
  className,
  onClick,
}: {
  status: Verification
  className?: string
  onClick?: () => void
}) {
  return (
    <Badge
      tone={VERIFICATION_TONES[status]}
      className={cn(onClick && 'cursor-pointer hover:brightness-125', className)}
    >
      {status === '待核实' ? '待核实' : status}
    </Badge>
  )
}

export function SourceBadge({ kind }: { kind: 'official' | 'media' | 'dealer' | 'test' | 'user' }) {
  const map = {
    official: { label: '官方', tone: 'teal' as const },
    media: { label: '媒体', tone: 'blue' as const },
    dealer: { label: '经销商', tone: 'violet' as const },
    test: { label: '实测', tone: 'lime' as const },
    user: { label: '个人', tone: 'amber' as const },
  }
  return <Badge tone={map[kind].tone}>{map[kind].label}</Badge>
}

export function ScoreRing({
  score,
  size = 56,
  label = '评分',
  coverage,
}: {
  score: number | null
  size?: number
  label?: string
  coverage?: number
}) {
  const stroke = size >= 60 ? 5 : 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const value = score ?? 0
  const offset = circumference - (Math.min(10, Math.max(0, value)) / 10) * circumference
  const color = score === null ? '#475569' : score >= 8.5 ? '#5eead4' : score >= 7.5 ? '#7dd3fc' : '#fbbf24'
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[13px] font-semibold leading-none text-mist-100">
          {score === null ? '—' : score.toFixed(1)}
        </span>
        <span className="mt-1 text-[8px] uppercase tracking-wider text-mist-500">
          {coverage !== undefined && coverage < 0.99 ? `${Math.round(coverage * 100)}%` : label}
        </span>
      </div>
    </div>
  )
}

export function VehicleCover({
  vehicle,
  className,
  compact = false,
}: {
  vehicle: Vehicle
  className?: string
  compact?: boolean
}) {
  const gradientId = useId().replace(/:/g, '')
  const isSedan = vehicle.bodyType === '轿车' || vehicle.bodyType === '轿跑SUV'
  const bodyPath = isSedan
    ? 'M18 86 C18 78 27 74 42 71 L84 66 L116 48 C124 43 134 41 148 41 L206 41 C222 41 236 47 248 57 L264 68 L288 72 C301 74 307 78 307 85 L307 92 L18 92 Z'
    : 'M18 86 C18 78 26 74 40 72 L78 68 L104 48 C112 42 122 40 136 39 L208 39 C222 39 234 44 244 53 L262 68 L286 72 C300 74 306 78 306 86 L306 92 L18 92 Z'
  const windowOne = isSedan
    ? 'M120 54 C126 48 134 47 146 47 L164 47 L164 65 L108 65 Z'
    : 'M112 52 C118 47 126 46 138 46 L162 46 L162 64 L104 64 Z'
  const windowTwo = isSedan
    ? 'M170 47 L204 47 C214 47 223 51 230 58 L238 65 L170 65 Z'
    : 'M168 46 L204 46 C214 46 223 50 230 57 L238 64 L168 64 Z'

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        background: `radial-gradient(120% 150% at 18% 0%, ${vehicle.accent}24, transparent 62%), linear-gradient(160deg, #101927 0%, #0a0f17 55%, #070b11 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.5) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
        }}
      />
      <div
        className="absolute -right-12 -top-16 size-48 rounded-full blur-3xl"
        style={{ background: `${vehicle.accent}22` }}
      />
      {vehicle.coverImage ? (
        <img
          src={vehicle.coverImage}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
      ) : (
        <svg
          viewBox="0 0 320 120"
          className={cn('absolute inset-x-0 bottom-0 w-full', compact ? 'h-[92px]' : 'h-[122px]')}
          preserveAspectRatio="xMidYMax meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`body-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.19" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id={`glass-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={vehicle.accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={vehicle.accent} stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <ellipse cx="164" cy="100" rx="150" ry="7" fill="#000" opacity="0.35" />
          <path d={bodyPath} fill={`url(#body-${gradientId})`} stroke="rgba(255,255,255,.16)" strokeWidth="1" />
          <path d={windowOne} fill={`url(#glass-${gradientId})`} opacity="0.9" />
          <path d={windowTwo} fill={`url(#glass-${gradientId})`} opacity="0.75" />
          <path d="M86 67 L80 79" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          <path d="M246 67 L254 79" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          <circle cx="84" cy="92" r="15" fill="#070b11" stroke="rgba(255,255,255,.24)" strokeWidth="1.2" />
          <circle cx="84" cy="92" r="6.5" fill="none" stroke={vehicle.accent} strokeOpacity="0.5" strokeWidth="1.2" />
          <circle cx="252" cy="92" r="15" fill="#070b11" stroke="rgba(255,255,255,.24)" strokeWidth="1.2" />
          <circle cx="252" cy="92" r="6.5" fill="none" stroke={vehicle.accent} strokeOpacity="0.5" strokeWidth="1.2" />
          <path d="M18 92 L306 92" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          <path d="M24 79 L52 79" stroke={vehicle.accent} strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M270 79 L296 79" stroke={vehicle.accent} strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {!vehicle.coverImage ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.16em] text-mist-300 backdrop-blur">
                {vehicle.year}
              </span>
              <span className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] text-mist-400 backdrop-blur">
                {vehicle.bodyType}
              </span>
            </div>
            {vehicle.keyCandidate ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9.5px] font-medium text-accent backdrop-blur">
                <Star className="size-2.5 fill-current" /> 重点候选
              </span>
            ) : null}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-[28px] font-semibold leading-none tracking-tight text-white/12">
              {getInitials(vehicle.brand)}
            </div>
            <div className="text-right text-[9px] uppercase tracking-[0.2em] text-white/25">
              {vehicle.specs.powertrain.cltcRange ? `CLTC ${vehicle.specs.powertrain.cltcRange} km` : 'SPEC TBD'}
            </div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
      )}

      {vehicle.coverImage ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="rounded-md border border-white/15 bg-black/35 px-1.5 py-0.5 text-[9px] font-medium text-mist-200 backdrop-blur">
            {vehicle.year}
          </span>
          {vehicle.keyCandidate ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-ink-950/60 px-2 py-0.5 text-[9.5px] font-medium text-accent backdrop-blur">
              <Star className="size-2.5 fill-current" /> 重点候选
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
