import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AppSettings, CostResult, PriceQuote, ScoreResult, Vehicle } from '@/types'
import { SCORE_DIMS } from '@/types'
import { formatDate, formatWan, isNum } from '@/lib/format'
import { computeBreakdown } from '@/lib/price'
import { vehicleName } from '@/lib/analytics'

const AXIS = { fill: '#64788f', fontSize: 10 }

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line-strong bg-ink-850/98 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
      <div className="mb-1.5 text-[10px] uppercase tracking-wider text-mist-500">{label}</div>
      <div className="space-y-1">
        {payload.map((item: any) => (
          <div key={String(item.dataKey)} className="flex items-center gap-2 text-[11px]">
            <span className="size-1.5 rounded-full" style={{ background: item.color ?? item.stroke }} />
            <span className="text-mist-400">{item.name}</span>
            <span className="num ml-auto font-medium text-mist-100">
              {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartFrame({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel p-4 sm:p-5 ${className ?? ''}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-mist-100">{title}</h2>
          {description ? <p className="mt-1 text-[10.5px] leading-4 text-mist-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ScoreBarChart({
  vehicles,
  scores,
  onSelect,
  height = 260,
}: {
  vehicles: Vehicle[]
  scores: Record<string, ScoreResult>
  onSelect?: (id: string) => void
  height?: number
}) {
  const data = vehicles
    .filter((v) => scores[v.id]?.total !== null && scores[v.id]?.total !== undefined)
    .map((v) => ({
      id: v.id,
      name: `${v.brand} ${v.model}`,
      short: v.model,
      score: scores[v.id].total ?? 0,
      coverage: scores[v.id].coverage,
      color: v.accent,
    }))
    .sort((a, b) => b.score - a.score)

  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-mist-500">暂无可排序的评分</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 42, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="rgba(99,120,145,.16)" strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 10]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={108}
          axisLine={false}
          tickLine={false}
          tick={{ ...AXIS, fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
        <Bar
          dataKey="score"
          name="综合评分"
          barSize={16}
          radius={[0, 5, 5, 0]}
          cursor={onSelect ? 'pointer' : 'default'}
          onClick={(entry: any) => onSelect?.(entry.id)}
        >
          {data.map((item) => (
            <Cell key={item.id} fill={item.color} fillOpacity={0.85} />
          ))}
          <LabelList
            dataKey="score"
            position="right"
            formatter={(value: any) => Number(value).toFixed(2)}
            style={{ fill: '#b3c3d6', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScoreRadarChart({
  vehicles,
  scores,
}: {
  vehicles: Vehicle[]
  scores: Record<string, ScoreResult>
}) {
  const eligible = vehicles.filter((v) => scores[v.id]?.coverage === 1)
  const data = SCORE_DIMS.map((dim) => {
    const row: Record<string, string | number> = { dim: dim.short }
    for (const vehicle of eligible) row[vehicle.id] = scores[vehicle.id].dims[dim.id].score ?? 0
    return row
  })

  if (eligible.length < 2) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong/70 text-center">
        <span className="text-xs text-mist-400">评分维度不完整</span>
        <span className="max-w-[240px] text-[10.5px] leading-4 text-mist-500">
          雷达图只纳入 7 个维度均有分数的车型；自动模式下缺失数据不会被当作 0 分。
        </span>
      </div>
    )
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={286}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="rgba(99,120,145,.25)" />
          <PolarAngleAxis dataKey="dim" tick={{ fill: '#8b9fb8', fontSize: 10.5 }} />
          {eligible.map((vehicle) => (
            <Radar
              key={vehicle.id}
              name={`${vehicle.brand} ${vehicle.model}`}
              dataKey={vehicle.id}
              stroke={vehicle.accent}
              strokeWidth={1.6}
              fill={vehicle.accent}
              fillOpacity={0.1}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 10, color: '#8b9fb8' }} iconType="circle" iconSize={6} />
          <Tooltip content={<ChartTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-1 text-center text-[9.5px] text-mist-500">10 分制 · 仅显示数据覆盖度 100% 的车型</div>
    </>
  )
}

export function PriceTrendChart({
  vehicles,
  quotes,
  settings,
  height = 280,
}: {
  vehicles: Vehicle[]
  quotes: PriceQuote[]
  settings: AppSettings
  height?: number
}) {
  const dated = quotes
    .filter((q) => vehicles.some((v) => v.id === q.vehicleId))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  const dates = Array.from(new Set(dated.map((q) => q.date)))
  const data = dates.map((date) => {
    const row: Record<string, string | number | null> = { date: formatDate(date) }
    for (const vehicle of vehicles) {
      const quote = dated.filter((q) => q.vehicleId === vehicle.id && q.date <= date).slice(-1)[0]
      if (quote) row[vehicle.id] = computeBreakdown(quote, settings).landing
    }
    return row
  })
  const hasTrend = vehicles.some(
    (vehicle) =>
      new Set(
        quotes
          .filter((quote) => quote.vehicleId === vehicle.id)
          .map((quote) => quote.date.slice(0, 10)),
      ).size >= 2,
  )

  if (!hasTrend) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong/70 text-center">
        <span className="text-xs text-mist-400">至少需要 2 个不同日期的报价才能形成趋势</span>
        <span className="max-w-[280px] text-[10.5px] leading-4 text-mist-500">
          在「价格追踪」或车型详情中记录新的门店报价，图表会按日期自动连线。同一天的多条报价会合并为同一个点。
        </span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="rgba(99,120,145,.15)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `${(value / 10000).toFixed(0)}万`}
          domain={['dataMin - 10000', 'dataMax + 10000']}
        />
        <Tooltip
          content={({ active, payload, label }: any) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-xl border border-line-strong bg-ink-850/98 px-3 py-2.5 shadow-2xl">
                <div className="mb-1.5 text-[10px] text-mist-500">{label}</div>
                {payload.map((item: any) => {
                  const vehicle = vehicles.find((v) => v.id === item.dataKey)
                  return (
                    <div key={item.dataKey} className="flex items-center gap-2 text-[11px]">
                      <span className="size-1.5 rounded-full" style={{ background: item.stroke }} />
                      <span className="text-mist-400">{vehicle ? vehicleName(vehicle) : item.name}</span>
                      <span className="num ml-auto font-medium text-mist-100">
                        {typeof item.value === 'number' ? formatWan(item.value) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, color: '#8b9fb8' }}
          iconType="circle"
          iconSize={6}
          formatter={(value) => {
            const vehicle = vehicles.find((v) => v.id === value)
            return vehicle ? vehicleName(vehicle) : value
          }}
        />
        {vehicles.map((vehicle) => (
          <Line
            key={vehicle.id}
            type="monotone"
            dataKey={vehicle.id}
            name={vehicleName(vehicle)}
            stroke={vehicle.accent}
            strokeWidth={2}
            dot={{ r: 3, fill: vehicle.accent, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function CostCurveChart({
  vehicles,
  costs,
  height = 280,
}: {
  vehicles: Vehicle[]
  costs: Record<string, CostResult>
  height?: number
}) {
  const years = Math.max(...vehicles.map((v) => costs[v.id]?.yearly.length ?? 0), 0)
  if (years === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-mist-500">落地价待核实，暂无法绘制持有成本曲线</div>
  }
  const data = Array.from({ length: years }, (_, index) => {
    const row: Record<string, string | number> = { year: `第 ${index + 1} 年` }
    for (const vehicle of vehicles) {
      row[vehicle.id] = costs[vehicle.id]?.yearly[index]?.cumulative ?? 0
    }
    return row
  })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -6 }}>
        <CartesianGrid stroke="rgba(99,120,145,.15)" strokeDasharray="3 3" />
        <XAxis dataKey="year" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `${(value / 10000).toFixed(0)}万`}
        />
        <Tooltip
          content={({ active, payload, label }: any) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-xl border border-line-strong bg-ink-850/98 px-3 py-2.5 shadow-2xl">
                <div className="mb-1.5 text-[10px] text-mist-500">{label}累计</div>
                {payload.map((item: any) => {
                  const vehicle = vehicles.find((v) => v.id === item.dataKey)
                  return (
                    <div key={item.dataKey} className="flex items-center gap-2 text-[11px]">
                      <span className="size-1.5 rounded-full" style={{ background: item.stroke }} />
                      <span className="text-mist-400">{vehicle ? vehicleName(vehicle) : item.name}</span>
                      <span className="num ml-auto font-medium text-mist-100">
                        {isNum(item.value) ? formatWan(item.value) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, color: '#8b9fb8' }}
          iconType="circle"
          iconSize={6}
          formatter={(value) => {
            const vehicle = vehicles.find((v) => v.id === value)
            return vehicle ? vehicleName(vehicle) : value
          }}
        />
        {vehicles.map((vehicle) => (
          <Line
            key={vehicle.id}
            type="monotone"
            dataKey={vehicle.id}
            name={vehicleName(vehicle)}
            stroke={vehicle.accent}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
