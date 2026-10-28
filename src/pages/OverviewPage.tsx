import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Columns3,
  Gauge,
  LayoutGrid,
  RefreshCw,
  Sparkles,
  Star,
  Table2,
  Target,
  TrendingDown,
  TriangleAlert,
  Trophy,
  Wallet,
} from 'lucide-react'
import type { Vehicle } from '@/types'
import { useApp } from '@/store/AppStore'
import { cn, formatDate, formatWan, monthsUntil } from '@/lib/format'
import { collectGaps, dataHealth, landingRange, priceMovements, vehicleName } from '@/lib/analytics'
import { Badge, Button, EmptyState, SectionTitle } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Field'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { VehicleTable } from '@/components/vehicle/VehicleTable'
import { VehicleFormModal } from '@/components/vehicle/VehicleFormModal'
import { ScoreBarChart, ScoreRadarChart, ChartFrame } from '@/components/charts/Charts'
import { ScoreRing } from '@/components/vehicle/VehicleVisuals'

type ViewMode = 'cards' | 'table'
type SortKey = 'score' | 'price' | 'range' | 'updated'

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'text-accent',
}: {
  label: string
  value: ReactNode
  sub: ReactNode
  icon: typeof Gauge
  accent?: string
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="label">{label}</span>
        <Icon className={cn('size-3.5', accent)} />
      </div>
      <div className="num mt-2.5 text-[22px] font-semibold leading-none tracking-tight text-mist-100">{value}</div>
      <div className="mt-1.5 text-[10.5px] leading-4 text-mist-500">{sub}</div>
    </div>
  )
}

export function OverviewPage() {
  const { data, priceMap, scoresResult, dispatch, toast } = useApp()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('cards')
  const [sort, setSort] = useState<SortKey>('score')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('carfleet.overview.view')
      if (saved === 'cards' || saved === 'table') setView(saved)
    } catch {
      // 浏览器禁用本地存储时忽略视图偏好
    }
  }, [])
  useEffect(() => {
    try {
      window.localStorage.setItem('carfleet.overview.view', view)
    } catch {
      // 忽略
    }
  }, [view])

  const { scores, filters, ranks } = scoresResult
  const vehicles = data.vehicles
  const months = monthsUntil(data.settings.targetPurchaseDate)
  const range = landingRange(priceMap)
  const gaps = useMemo(() => collectGaps(vehicles, data.settings), [vehicles, data.settings])
  const movements = useMemo(() => priceMovements(vehicles, data.quotes, data.settings), [vehicles, data.quotes, data.settings])
  const health = dataHealth(vehicles)

  const sortedByScore = [...vehicles]
    .filter((v) => scores[v.id]?.total !== null)
    .sort((a, b) => (scores[b.id]?.total ?? -1) - (scores[a.id]?.total ?? -1))
  const topOverall = sortedByScore[0] ?? null
  const keyCandidates = vehicles.filter((v) => v.keyCandidate)
  const topKey = [...keyCandidates]
    .filter((v) => scores[v.id]?.total !== null && filters[v.id]?.status !== 'fail')
    .sort((a, b) => (scores[b.id]?.total ?? -1) - (scores[a.id]?.total ?? -1))[0] ?? null
  const topAdas = [...vehicles]
    .filter((v) => (scores[v.id]?.dims.adas.score ?? null) !== null)
    .sort((a, b) => (scores[b.id]?.dims.adas.score ?? -1) - (scores[a.id]?.dims.adas.score ?? -1))[0] ?? null
  const topValue = [...vehicles]
    .filter((v) => (scores[v.id]?.dims.price.score ?? null) !== null)
    .sort((a, b) => (scores[b.id]?.dims.price.score ?? -1) - (scores[a.id]?.dims.price.score ?? -1))[0] ?? null

  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (sort === 'score') return (scores[b.id]?.total ?? -1) - (scores[a.id]?.total ?? -1)
    if (sort === 'price') return (priceMap[a.id]?.breakdown.landing ?? Infinity) - (priceMap[b.id]?.breakdown.landing ?? Infinity)
    if (sort === 'range') return (b.specs.powertrain.cltcRange ?? -1) - (a.specs.powertrain.cltcRange ?? -1)
    return b.updatedAt.localeCompare(a.updatedAt)
  })

  const maxMoney = Math.max(range.max ?? 0, data.settings.budgetMax, 1) * 1.08
  const minMoney = 0

  const latestQuotes = [...data.quotes]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  if (vehicles.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <EmptyState
          icon={Sparkles}
          title="你的车库还是空的"
          description="恢复初始的 6 款车型示例，或从零开始录入你正在关注的车型。所有内容都可以随时编辑。"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => dispatch({ type: 'RESET_SEED' })}>
                恢复示例数据
              </Button>
              <Button onClick={() => setFormOpen(true)}>新增车型</Button>
            </div>
          }
        />
        <VehicleFormModal open={formOpen} vehicle={null} onClose={() => setFormOpen(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-line-strong/70 bg-ink-850 p-5 sm:p-7">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 160% at 8% 0%, rgba(94,234,212,.14), transparent 58%), radial-gradient(80% 140% at 92% 10%, rgba(125,211,252,.12), transparent 60%), linear-gradient(150deg, rgba(255,255,255,.03), transparent 45%)',
          }}
        />
        <div className="absolute -right-8 top-1/2 hidden -translate-y-1/2 select-none text-[120px] font-bold leading-none tracking-tighter text-white/[0.025] lg:block">
          {data.settings.targetPurchaseDate.slice(0, 4)}
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal" dot>
                个人选车决策台
              </Badge>
              <Badge tone="neutral">纯电 SUV 优先</Badge>
              <Badge tone="neutral">计划 {data.settings.targetPurchaseDate.slice(0, 4)} 年购车</Badge>
            </div>
            <h1 className="display mt-4 text-[30px] font-semibold text-mist-100 sm:text-[38px]">
              把选车，变成一场
              <span className="text-accent">有据可依</span>的决策
            </h1>
            <p className="mt-3 max-w-xl text-[12.5px] leading-6 text-mist-400">
              记录关注过的每一款车，核对价格与配置来源，比较续航、智驾、底盘与长期持有成本。评分只代表你的个人偏好，不是客观质量排名。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" icon={Columns3} onClick={() => navigate('/compare')}>
                打开对比（{data.compareIds.length}）
              </Button>
              <Button variant="secondary" size="sm" icon={Target} onClick={() => navigate('/score')}>
                调整评分权重
              </Button>
              <span className="ml-1 hidden items-center gap-1 text-[10px] text-mist-500 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-positive" />
                已标注 {health.official} 项官方来源
              </span>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3">
            <div className="rounded-xl border border-line/80 bg-ink-900/55 px-4 py-3 backdrop-blur">
              <div className="label flex items-center gap-1.5">
                <CalendarClock className="size-3" /> 距购车计划
              </div>
              <div className="num mt-1.5 flex items-baseline gap-1">
                <span className="text-[28px] font-semibold leading-none text-mist-100">{months ?? '—'}</span>
                <span className="text-[10px] text-mist-500">个月</span>
              </div>
              <div className="mt-1 text-[9.5px] text-mist-500">{formatDate(data.settings.targetPurchaseDate)}</div>
            </div>
            <div className="rounded-xl border border-line/80 bg-ink-900/55 px-4 py-3 backdrop-blur">
              <div className="label flex items-center gap-1.5">
                <Wallet className="size-3" /> 购车预算
              </div>
              <div className="num mt-1.5 text-[18px] font-semibold leading-none text-mist-100">
                {formatWan(data.settings.budgetMin)}–{formatWan(data.settings.budgetMax)}
              </div>
              <div className="mt-1 text-[9.5px] text-mist-500">可在设置中修改</div>
            </div>
            <div className="col-span-2 rounded-xl border border-line/80 bg-ink-900/55 px-4 py-2.5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-mist-500">当前价格区间（预计落地）</span>
                <span className="num text-[12px] font-medium text-accent">
                  {range.min !== null ? `${formatWan(range.min)} – ${formatWan(range.max)}` : '待录入'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="关注车型"
          value={vehicles.length}
          sub={`${keyCandidates.length} 款重点候选 · ${vehicles.filter((v) => v.focusStatus === '暂时淘汰').length} 款淘汰`}
          icon={LayoutGrid}
        />
        <KpiCard
          label="预算区间"
          value={`${(data.settings.budgetMin / 10000).toFixed(0)}–${(data.settings.budgetMax / 10000).toFixed(0)} 万`}
          sub={`购车目标 ${formatDate(data.settings.targetPurchaseDate)}`}
          icon={Wallet}
          accent="text-sky-300"
        />
        <KpiCard
          label="最低预计落地"
          value={range.min !== null ? formatWan(range.min) : '待核实'}
          sub={range.count > 0 ? `${range.count}/${vehicles.length} 款已有可计算报价` : '尚无报价记录'}
          icon={CircleDollarSign}
          accent="text-teal-300"
        />
        <KpiCard
          label="综合评分最高"
          value={topOverall ? scores[topOverall.id]?.total?.toFixed(2) : '—'}
          sub={topOverall ? `${vehicleName(topOverall)} · ${topOverall.trim || '版本待补充'}` : '暂无完整评分'}
          icon={Trophy}
          accent="text-amber-300"
        />
        <KpiCard
          label="性价比最高"
          value={topValue ? scores[topValue.id]?.dims.price.score?.toFixed(1) : '—'}
          sub={topValue ? `${vehicleName(topValue)} · 价格与性价比维度` : '缺少价格/续航数据'}
          icon={TrendingDown}
          accent="text-lime-300"
        />
        <KpiCard
          label="智驾最强候选"
          value={topAdas ? scores[topAdas.id]?.dims.adas.score?.toFixed(1) : '—'}
          sub={topAdas ? `${vehicleName(topAdas)} · ${topAdas.specs.adas.solution || '方案待核实'}` : '暂无智驾评分'}
          icon={Gauge}
          accent="text-violet-300"
        />
      </section>

      {/* TOP PICK */}
      {topKey ? (
        <section className="panel relative overflow-hidden p-5 sm:p-6">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background: `linear-gradient(100deg, ${topKey.accent}12, transparent 42%)`,
            }}
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                <Star className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="label flex items-center gap-2">
                  重点候选 · 当前偏好第一
                  <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-mist-500">个人模型</span>
                </div>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-mist-100">
                  {topKey.brand} {topKey.model}
                  <span className="ml-2 text-[12px] font-normal text-mist-400">{topKey.trim}</span>
                </h2>
                <p className="mt-2 max-w-2xl text-[11.5px] leading-5 text-mist-400">{topKey.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="teal">CLTC {topKey.specs.powertrain.cltcRange ?? '—'} km</Badge>
                  <Badge tone="blue">{topKey.specs.adas.solution || '智驾待核实'}</Badge>
                  <Badge tone="neutral">排名 {ranks[topKey.id] ?? '—'} / {vehicles.length}</Badge>
                  {priceMap[topKey.id]?.breakdown.landing ? (
                    <Badge tone="lime">预计落地 {formatWan(priceMap[topKey.id].breakdown.landing)}</Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-5 lg:pl-6">
              <div className="text-center">
                <ScoreRing score={scores[topKey.id]?.total ?? null} coverage={scores[topKey.id]?.coverage} size={78} />
                <div className="mt-2 text-[9px] uppercase tracking-wider text-mist-500">综合评分 / 10</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="primary" size="sm" icon={ArrowRight} onClick={() => navigate(`/garage/${topKey.id}`)}>
                  打开车型详情
                </Button>
                <Button variant="secondary" size="sm" icon={Columns3} onClick={() => navigate('/compare')}>
                  与其余候选对比
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* CHARTS */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_minmax(0,1fr)]">
        <ChartFrame
          title="综合评分排序"
          description="默认使用手动评分；权重与评分在「评分模型」中调整。点击柱条查看车型详情。"
          action={<Badge tone="neutral">{data.scoring.mode === 'manual' ? '手动评分' : '自动评分'}</Badge>}
        >
          <ScoreBarChart vehicles={vehicles} scores={scores} onSelect={(id) => navigate(`/garage/${id}`)} />
        </ChartFrame>

        <ChartFrame
          title="重点候选画像"
          description="价格、智驾、底盘、续航、空间、座舱与品牌七个维度（10 分制）。"
          action={
            <Link to="/score" className="text-[10.5px] text-mist-400 transition hover:text-accent">
              查看明细 →
            </Link>
          }
        >
          <ScoreRadarChart vehicles={keyCandidates} scores={scores} />
        </ChartFrame>
      </div>

      {/* BUDGET + GAPS */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_minmax(0,1fr)]">
        <ChartFrame
          title="预算 vs 预计落地"
          description={`预算区间 ${formatWan(data.settings.budgetMin)}–${formatWan(data.settings.budgetMax)}；条形为预计落地价，竖线为官方指导价。`}
          action={<Badge tone="amber">保守口径 · 未计置换</Badge>}
        >
          <div className="space-y-3.5">
            {sortedByScore.slice(0, 6).map((vehicle) => {
              const info = priceMap[vehicle.id]
              const landing = info?.breakdown.landing ?? null
              const guide = info?.quote?.guidePrice ?? null
              const width = landing !== null ? ((landing - minMoney) / (maxMoney - minMoney)) * 100 : 0
              return (
                <div key={vehicle.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                    <Link to={`/garage/${vehicle.id}`} className="truncate text-mist-300 transition hover:text-accent">
                      {vehicle.brand} {vehicle.model}
                      <span className="ml-1.5 text-[10px] text-mist-500">{vehicle.trim}</span>
                    </Link>
                    <span className="num shrink-0 text-mist-400">
                      {landing !== null ? formatWan(landing) : '待核实'}
                      {info?.breakdown.budgetDelta !== null && info?.breakdown.budgetDelta !== undefined ? (
                        <span className={cn('ml-1.5 text-[10px]', info.breakdown.budgetDelta > 0 ? 'text-danger' : 'text-positive')}>
                          {info.breakdown.budgetDelta > 0 ? '+' : ''}
                          {(info.breakdown.budgetDelta / 10000).toFixed(2)} 万
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="relative h-6 overflow-hidden rounded-md bg-white/[0.03]">
                    <div
                      className="absolute inset-y-0 border-x border-accent/25 bg-accent/[0.07]"
                      style={{
                        left: `${((data.settings.budgetMin - minMoney) / (maxMoney - minMoney)) * 100}%`,
                        width: `${((data.settings.budgetMax - data.settings.budgetMin) / (maxMoney - minMoney)) * 100}%`,
                      }}
                    />
                    {landing !== null ? (
                      <div
                        className="absolute inset-y-1 rounded-sm"
                        style={{
                          left: 0,
                          width: `${Math.max(1.5, width)}%`,
                          background: `linear-gradient(90deg, ${vehicle.accent}33, ${vehicle.accent}cc)`,
                          borderRight: `2px solid ${vehicle.accent}`,
                        }}
                      />
                    ) : (
                      <div className="absolute inset-y-1 left-1 right-1 rounded-sm border border-dashed border-line-strong/80" />
                    )}
                    {guide !== null ? (
                      <div
                        className="absolute inset-y-0 w-px bg-mist-300/60"
                        style={{ left: `${((guide - minMoney) / (maxMoney - minMoney)) * 100}%` }}
                        title={`指导价 ${formatWan(guide)}`}
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-4 pt-1 text-[9.5px] text-mist-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-sm bg-accent/25" /> 预算区间
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-px bg-mist-300/70" /> 指导价
              </span>
              <span className="ml-auto">仅显示评分前 6 款</span>
            </div>
          </div>
        </ChartFrame>

        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title="待核实与数据缺口"
            description="缺失或过期的关键参数。补齐后自动评分会更可靠。"
            action={<Badge tone="amber">{gaps.length} 项</Badge>}
          />
          <div className="mt-4 space-y-2">
            {gaps.slice(0, 8).map((gap, index) => (
              <Link
                key={`${gap.vehicleId}-${gap.path}-${index}`}
                to={`/garage/${gap.vehicleId}`}
                className="flex items-center gap-3 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 transition hover:border-amber-300/30 hover:bg-amber-300/[0.03]"
              >
                <TriangleAlert className="size-3.5 shrink-0 text-amber-300/80" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] text-mist-300">
                    {gap.vehicleName} · {gap.label}
                  </div>
                  <div className="truncate text-[9.5px] text-mist-500">{gap.detail}</div>
                </div>
                <ArrowUpRight className="size-3.5 shrink-0 text-mist-600" />
              </Link>
            ))}
            {gaps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-[11px] text-mist-500">
                关键参数都有来源标注，很好。
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-[10px] text-mist-500">
            <span>
              官方 {health.official} · 媒体/实测 {health.media} · 待核实 {health.unverified}
            </span>
            <Link to="/data" className="text-mist-400 transition hover:text-accent">
              数据管理 →
            </Link>
          </div>
        </section>
      </div>

      {/* VEHICLE LIST */}
      <section>
        <SectionTitle
          title="关注车型"
          description="卡片视图用于快速浏览，表格视图用于横向扫描价格与评分。"
          action={
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="field h-8 w-auto py-0 text-[11px]"
                aria-label="排序方式"
              >
                <option value="score">综合评分</option>
                <option value="price">落地价从低到高</option>
                <option value="range">CLTC 续航</option>
                <option value="updated">最近更新</option>
              </select>
              <Segmented
                value={view}
                onChange={(next) => setView(next)}
                size="sm"
                options={[
                  { value: 'cards', label: '卡片', icon: <LayoutGrid className="size-3.5" /> },
                  { value: 'table', label: '表格', icon: <Table2 className="size-3.5" /> },
                ]}
              />
            </div>
          }
        />
        <div className="mt-4">
          {view === 'cards' ? (
            <div className="card-grid">
              {sortedVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  priceInfo={priceMap[vehicle.id]}
                  score={scores[vehicle.id]}
                  filter={filters[vehicle.id]}
                  onEdit={(v) => {
                    setEditing(v)
                    setFormOpen(true)
                  }}
                />
              ))}
            </div>
          ) : (
            <VehicleTable
              vehicles={sortedVehicles}
              priceMap={priceMap}
              scores={scores}
              filters={filters}
              onEdit={(v) => {
                setEditing(v)
                setFormOpen(true)
              }}
            />
          )}
        </div>
      </section>

      {/* PRICE FEED */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title="最近报价"
            description="价格记录按日期归档；同一车型可保存多个时间点。"
            action={
              <Link to="/prices" className="text-[10.5px] text-mist-400 transition hover:text-accent">
                全部报价 →
              </Link>
            }
          />
          <div className="mt-4 space-y-2">
            {latestQuotes.map((quote) => {
              const vehicle = vehicles.find((v) => v.id === quote.vehicleId)
              const landing = priceMap[quote.vehicleId]?.breakdown.landing
              if (!vehicle) return null
              return (
                <Link
                  key={quote.id}
                  to={`/prices?vehicle=${quote.vehicleId}`}
                  className="flex items-center gap-3 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2.5 transition hover:border-accent/25"
                >
                  <span className="num w-12 shrink-0 text-[10px] text-mist-500">{formatDate(quote.date)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] text-mist-300">
                      {vehicleName(vehicle)} <span className="text-mist-500">· {quote.label}</span>
                    </div>
                    <div className="text-[9.5px] text-mist-500">{quote.sourceLabel || quote.conditions || '未填写来源说明'}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="num text-[12px] font-medium text-mist-100">{formatWan(landing)}</div>
                    <div className="text-[9px] text-mist-500">落地估算</div>
                  </div>
                </Link>
              )
            })}
            {latestQuotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong px-3 py-8 text-center text-[11px] text-mist-500">
                还没有报价记录。
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title="价格变动"
            description="同车型多次报价之间，按相同口径计算落地价变化。"
            action={<Badge tone="neutral">{movements.length} 次</Badge>}
          />
          <div className="mt-4 space-y-2">
            {movements.slice(0, 5).map((movement) => (
              <div key={`${movement.quoteId}-${movement.fromDate}`} className="flex items-center gap-3 rounded-lg border border-line/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] text-mist-300">{movement.vehicleName}</div>
                  <div className="text-[9.5px] text-mist-500">
                    {formatDate(movement.fromDate)} → {formatDate(movement.toDate)}
                  </div>
                </div>
                <div className={cn('num text-[12px] font-medium', movement.delta > 0 ? 'text-danger' : 'text-positive')}>
                  {movement.delta > 0 ? '+' : ''}
                  {(movement.delta / 10000).toFixed(2)} 万
                </div>
              </div>
            ))}
            {movements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong px-3 py-8 text-center">
                <p className="text-[11px] text-mist-400">还没有可用于比较的价格变动</p>
                <p className="mt-1 text-[10px] text-mist-500">每个车型记录第 2 次报价后，这里会显示变化。</p>
                <Link to="/prices" className="mt-3 inline-flex items-center gap-1 text-[10.5px] text-accent">
                  去记录报价 <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : null}
          </div>
          <div className="mt-4 rounded-lg border border-line/60 bg-white/[0.012] p-3 text-[10px] leading-4 text-mist-500">
            价格口径：经销商报价优先，扣除现金优惠与勾选的附加条件优惠，加选装/智驾包、购置税、保险与上牌费，再减去勾选的置换补贴。
            点击「价格追踪」可查看逐项明细。
          </div>
        </section>
      </div>

      <div className="flex items-center justify-center pb-2">
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="inline-flex items-center gap-1.5 text-[10px] text-mist-600 transition hover:text-mist-400"
        >
          <RefreshCw className="size-3" /> 恢复初始示例数据
        </button>
      </div>

      {formOpen ? (
        <VehicleFormModal
          open={formOpen}
          vehicle={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        open={resetOpen}
        title="恢复初始示例数据？"
        description="当前所有车型、报价、评分、对比选择与设置都会被示例数据覆盖，且无法撤销。建议先到数据管理导出 JSON 备份。"
        confirmLabel="覆盖并恢复"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'RESET_SEED' })
          setResetOpen(false)
          toast('已恢复初始示例数据', 'info')
        }}
      />
    </div>
  )
}
