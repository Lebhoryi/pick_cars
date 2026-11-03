import { Pencil, TrendingUp } from 'lucide-react'
import type { SalesSummary, Vehicle } from '@/types'
import { cn } from '@/lib/format'
import { formatUnits, formatUnitsCompact, monthLabel, shortMonth } from '@/lib/sales'
import { Badge, Button, ProgressBar, SectionTitle } from '@/components/ui/primitives'

export function SalesPill({ summary, className }: { summary: SalesSummary | undefined; className?: string }) {
  if (!summary || !summary.hasData) {
    return (
      <span className={cn('text-[10.5px] text-mist-500', className)}>
        销量 待核实
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[10.5px] text-mist-400', className)}>
      <TrendingUp className="size-3 text-accent/70" />
      <span className="num font-medium text-mist-200">{formatUnitsCompact(summary.cumulative)}</span>
      <span className="text-mist-500">
        累计 · {summary.recordedMonths}/{summary.expectedMonths} 月
      </span>
    </span>
  )
}

export function SalesPanel({
  vehicle,
  summary,
  onEdit,
}: {
  vehicle: Vehicle
  summary: SalesSummary
  onEdit: () => void
}) {
  const max = Math.max(...summary.series.map((point) => point.units ?? 0), 1)
  const records = summary.series.filter((point) => point.units !== null)

  return (
    <section className="panel p-4 sm:p-5">
      <SectionTitle
        title="销量"
        description={`统计窗口 ${monthLabel(summary.windowStart)} – ${monthLabel(summary.windowEnd)}，从上市月与 2026-01 中较晚的一个开始算。`}
        action={
          <Button size="sm" variant="secondary" icon={Pencil} onClick={onEdit}>
            录入 / 更新
          </Button>
        }
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="label mb-1">累计销量</div>
          <div className={cn('num text-[22px] font-semibold leading-none', summary.hasData ? 'text-accent' : 'text-mist-500')}>
            {summary.hasData ? formatUnits(summary.cumulative) : '待核实'}
          </div>
          <div className="mt-1 text-[10px] text-mist-500">
            {summary.hasData ? `${summary.recordedMonths} 个月已录` : '尚未录入'}
          </div>
        </div>
        <div>
          <div className="label mb-1">月均</div>
          <div className="num text-[22px] font-semibold leading-none text-mist-100">
            {summary.monthlyAvg !== null ? formatUnits(summary.monthlyAvg) : '—'}
          </div>
          <div className="mt-1 text-[10px] text-mist-500">仅按已录月份平均</div>
        </div>
        <div>
          <div className="label mb-1">最新月</div>
          <div className="num text-[22px] font-semibold leading-none text-mist-100">
            {summary.latest ? formatUnits(summary.latest.units) : '—'}
          </div>
          <div className="mt-1 text-[10px] text-mist-500">
            {summary.latest ? monthLabel(summary.latest.month) : '无数据'}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-mist-500">
          <span>数据覆盖</span>
          <span className="num">
            {summary.recordedMonths}/{summary.expectedMonths} 月 · {Math.round(summary.coverage * 100)}%
          </span>
        </div>
        <ProgressBar value={summary.coverage} tone={summary.coverage === 1 ? 'teal' : 'amber'} />
      </div>

      <div className="mt-5 flex h-[92px] items-end gap-1.5">
        {summary.series.map((point) => {
          const height = point.units === null ? 0 : Math.max(6, (point.units / max) * 100)
          return (
            <div key={point.month} className="group flex h-full min-w-0 max-w-[64px] flex-1 flex-col justify-end">
              <div
                className={cn(
                  'relative w-full rounded-t-[3px] transition',
                  point.units === null ? 'border border-dashed border-line-strong/80 bg-transparent' : 'bg-accent/55 group-hover:bg-accent/80',
                )}
                style={point.units === null ? { height: '100%' } : { height: `${height}%` }}
                title={
                  point.units === null
                    ? `${monthLabel(point.month)}：待核实${point.note ? `（${point.note}）` : ''}`
                    : `${monthLabel(point.month)}：${point.units.toLocaleString('zh-CN')} 辆`
                }
              />
              <div className="mt-1 truncate text-center text-[9px] text-mist-500">{shortMonth(point.month)}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[11px] text-mist-500">
            尚无销量数字。点「录入 / 更新」按月份补录，缺数据的月份会显示待核实。
          </div>
        ) : (
          records
            .slice()
            .reverse()
            .map((point) => (
              <div
                key={point.month}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2"
              >
                <span className="num w-14 shrink-0 text-[11px] text-mist-400">{shortMonth(point.month)}</span>
                <span className="num w-20 shrink-0 text-[12px] font-medium text-mist-100">
                  {formatUnits(point.units)}
                </span>
                <Badge tone={point.status === '官方' ? 'teal' : point.status === '待核实' ? 'amber' : 'neutral'}>
                  {point.scope ?? '待核实'}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-[10px] text-mist-500" title={point.note}>
                  {point.note || '—'}
                </span>
              </div>
            ))
        )}
      </div>

      {summary.recordedMonths < summary.expectedMonths ? (
        <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2 text-[10px] leading-4 text-amber-100/80">
          窗口内还有 {summary.expectedMonths - summary.recordedMonths} 个月没有数字：累计与月均只统计已录月份，不是完整窗口合计。
          分车型销量通常要等乘联会月度榜单（次月中旬）或品牌战报拆分。
        </div>
      ) : null}

      <div className="mt-3 text-[9.5px] leading-4 text-mist-500">
        {vehicle.brand} {vehicle.model} · 上市时间 {vehicle.specs.basic.launchDate || '待核实'} · 数据截至{' '}
        {monthLabel(summary.windowEnd)}
      </div>
    </section>
  )
}
