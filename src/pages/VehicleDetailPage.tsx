import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  Car,
  Columns3,
  ExternalLink,
  Info,
  Link2,
  Pencil,
  Plus,
  Radar,
  Ruler,
  ShieldCheck,
  Star,
  StickyNote,
  Trash2,
  TrendingDown,
  TriangleAlert,
  Wrench,
  Zap,
  Armchair,
  CircleDollarSign,
} from 'lucide-react'
import type { PriceQuote, ScoreDimId, Vehicle } from '@/types'
import { SCORE_DIMS } from '@/types'
import { ALL_SPEC_FIELDS, SPEC_GROUPS, formatSpecValue, getSpecValue, isEmptyValue } from '@/data/specSchema'
import { useApp } from '@/store/AppStore'
import { cn, daysSince, formatDate, formatPercent, formatWan, sourceHost, truncate } from '@/lib/format'
import { computeBreakdown, discountVsGuide, quotesForVehicle } from '@/lib/price'
import { dataHealth } from '@/lib/analytics'
import { Badge, Button, Divider, EmptyState, IconButton, KeyValue, ProgressBar, SectionTitle } from '@/components/ui/primitives'
import { TabBar } from '@/components/ui/Field'
import { ScoreRing, SourceBadge, StatusBadge, VehicleCover, VerificationBadge } from '@/components/vehicle/VehicleVisuals'
import { VehicleFormModal } from '@/components/vehicle/VehicleFormModal'
import { QuoteFormModal } from '@/components/price/QuoteFormModal'
import { PriceTrendChart } from '@/components/charts/Charts'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'

type DetailTab =
  | 'overview'
  | 'price'
  | 'basic'
  | 'powertrain'
  | 'body'
  | 'chassis'
  | 'comfort'
  | 'adas'
  | 'safety'
  | 'notes'
  | 'sources'

const TAB_IDS: DetailTab[] = [
  'overview',
  'price',
  'basic',
  'powertrain',
  'body',
  'chassis',
  'comfort',
  'adas',
  'safety',
  'notes',
  'sources',
]

const TAB_LABELS: Record<DetailTab, string> = {
  overview: '概览',
  price: '价格',
  basic: '车款',
  powertrain: '三电',
  body: '空间',
  chassis: '底盘',
  comfort: '舒适',
  adas: '智驾',
  safety: '安全',
  notes: '笔记',
  sources: '来源',
}

const GROUP_ICONS: Record<string, typeof Car> = {
  basic: Car,
  powertrain: Zap,
  body: Ruler,
  chassis: Wrench,
  comfort: Armchair,
  adas: Radar,
  safety: ShieldCheck,
}

function ProvenanceLine({ vehicle, path }: { vehicle: Vehicle; path: string }) {
  const prov = vehicle.provenance[path]
  const source = prov?.sourceId ? vehicle.sources.find((s) => s.id === prov.sourceId) : undefined
  const url = prov?.url || source?.url
  const status = prov?.status ?? '待核实'
  const [group, key] = path.split('.')
  const rawValue = (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[group]?.[key]
  const valueEmpty = rawValue === null || rawValue === undefined || rawValue === '' || rawValue === '待核实'
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9.5px] text-mist-500">
      {prov ? <VerificationBadge status={status} /> : valueEmpty ? <Badge tone="neutral">待核实</Badge> : <Badge tone="amber">来源未标注</Badge>}
      {prov?.checkedAt ? <span className="num">{formatDate(prov.checkedAt)}</span> : null}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-mist-400 transition hover:text-accent"
        >
          <ExternalLink className="size-2.5" /> {source ? sourceHost(source.url) : '来源'}
        </a>
      ) : null}
      {prov?.condition ? (
        <span className="inline-flex items-center gap-0.5 text-amber-200/70">
          <Info className="size-2.5" /> {prov.condition}
        </span>
      ) : null}
    </div>
  )
}

function SpecGroupPanel({ vehicle, groupId, onEdit }: { vehicle: Vehicle; groupId: keyof Vehicle['specs']; onEdit: () => void }) {
  const group = SPEC_GROUPS.find((g) => g.id === groupId)
  if (!group) return null
  const fields = group.fields
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-mist-100">{group.label}</h2>
          <p className="mt-1 text-[10.5px] leading-4 text-mist-500">{group.description}</p>
        </div>
        <Button size="sm" variant="secondary" icon={Pencil} onClick={onEdit}>
          编辑本组
        </Button>
      </div>
      <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const path = `${group.id}.${field.key}`
          const [g, key] = path.split('.')
          const value = (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[g]?.[key]
          const empty = value === null || value === undefined || value === '' || value === '待核实'
          return (
            <div key={path} className={cn('min-w-0 border-b border-line/35 pb-4', field.type === 'textarea' && 'sm:col-span-2 xl:col-span-3')}>
              <div className="label mb-1.5">{field.label}</div>
              <div
                className={cn(
                  'whitespace-pre-line text-[12.5px] leading-5',
                  empty ? 'text-mist-500' : 'text-mist-100',
                )}
              >
                {empty ? '待核实' : formatSpecValue(field, value)}
              </div>
              <ProvenanceLine vehicle={vehicle} path={path} />
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 text-[10px] text-mist-500">
        <Info className="size-3.5 shrink-0" />
        官方参数与媒体/实测数据分开标注；选装配置不等同于全系标配，比较时请核对硬件与软件开通条件。
      </div>
    </div>
  )
}

function ScoreBreakdown({ vehicle }: { vehicle: Vehicle }) {
  const { scoresResult, data } = useApp()
  const score = scoresResult.scores[vehicle.id]
  if (!score) return null
  return (
    <div className="panel p-4 sm:p-5">
      <SectionTitle
        title="个人偏好评分"
        description="权重可在评分模型中调整；缺失维度不会被当作 0 分，而是按已有维度重新归一化。"
        action={
          <Link to="/score" className="text-[10.5px] text-mist-400 transition hover:text-accent">
            调整权重 →
          </Link>
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="text-center">
          <ScoreRing score={score.total} coverage={score.coverage} size={78} />
          <div className="mt-1.5 text-[9px] uppercase tracking-wider text-mist-500">综合 / 10</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-[10px] text-mist-500">
            <span>数据覆盖度</span>
            <span className="num">{Math.round(score.coverage * 100)}%</span>
          </div>
          <ProgressBar value={score.coverage} className="mt-1.5" tone={score.coverage >= 0.8 ? 'teal' : 'amber'} />
          <p className="mt-2 text-[10px] leading-4 text-mist-500">
            {data.scoring.mode === 'manual' ? '当前使用手动评分。' : '当前使用自动评分，依据来自已录入参数。'}
            {score.coverage < 0.8 ? ' 部分维度信息不足，总分仅作参考。' : ''}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {SCORE_DIMS.map((dim) => {
          const item = score.dims[dim.id]
          const value = item.score
          return (
            <div key={dim.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                <span className="text-mist-400">{dim.label}</span>
                <span className="num text-mist-200">
                  {value !== null ? value.toFixed(1) : '信息不足'}
                  <span className="ml-2 text-[9px] text-mist-500">权重 {(item.effectiveWeight * 100).toFixed(0)}%</span>
                </span>
              </div>
              <ProgressBar
                value={(value ?? 0) / 10}
                height="h-1"
                tone={value === null ? 'rose' : value >= 8 ? 'teal' : value >= 7 ? 'blue' : 'amber'}
              />
              {data.scoring.mode === 'auto' && item.basis ? (
                <div className="mt-1 line-clamp-2 text-[9.5px] leading-4 text-mist-500">{item.basis}</div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}


function DataCompletenessCard({ vehicle, onEdit }: { vehicle: Vehicle; onEdit: () => void }) {
  const stats = SPEC_GROUPS.map((group) => {
    const filled = group.fields.filter((field) => !isEmptyValue(getSpecValue(vehicle, `${group.id}.${field.key}`))).length
    return { id: group.id, label: group.label, filled, total: group.fields.length }
  })
  const filled = stats.reduce((sum, item) => sum + item.filled, 0)
  const total = stats.reduce((sum, item) => sum + item.total, 0)
  const overall = total === 0 ? 0 : filled / total
  const missing = stats.filter((item) => item.filled < item.total).sort((a, b) => b.total - b.filled - (a.total - a.filled))

  return (
    <section className="panel p-4 sm:p-5">
      <SectionTitle
        title="参数完整度"
        description="按字段填写情况统计，空值或「待核实」不计入；与评分覆盖度不同。"
        action={<Badge tone={overall >= 0.8 ? 'teal' : 'amber'}>{Math.round(overall * 100)}%</Badge>}
      />
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
        {stats.map((item) => (
          <div key={item.id}>
            <div className="flex items-center justify-between text-[9.5px] text-mist-500">
              <span>{item.label}</span>
              <span className="num">{item.filled}/{item.total}</span>
            </div>
            <ProgressBar
              value={item.total === 0 ? 0 : item.filled / item.total}
              height="h-1"
              tone={item.filled === item.total ? 'teal' : 'amber'}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>
      {missing.length > 0 ? (
        <div className="mt-4 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 text-[10px] leading-4 text-mist-500">
          缺口集中在：{missing.slice(0, 3).map((item) => `${item.label}（${item.total - item.filled} 项）`).join('、')}。
        </div>
      ) : null}
      <Button className="mt-3 w-full" size="sm" variant="secondary" icon={Pencil} onClick={onEdit}>
        补齐参数
      </Button>
    </section>
  )
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, priceMap, scoresResult, dispatch, toast } = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const vehicle = data.vehicles.find((v) => v.id === id)
  const [tab, setTab] = useState<DetailTab>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<PriceQuote | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [scoreDetailOpen, setScoreDetailOpen] = useState(false)

  useEffect(() => {
    const requested = searchParams.get('tab') as DetailTab | null
    if (requested && TAB_IDS.includes(requested)) setTab(requested)
  }, [searchParams])

  const info = vehicle ? priceMap[vehicle.id] : null
  const score = vehicle ? scoresResult.scores[vehicle.id] : null
  const quotes = vehicle ? quotesForVehicle(data.quotes, vehicle.id) : []
  const inCompare = vehicle ? data.compareIds.includes(vehicle.id) : false

  const lastVerified = useMemo(() => {
    if (!vehicle) return null
    const dates = Object.values(vehicle.provenance)
      .map((p) => p.checkedAt)
      .filter((d): d is string => Boolean(d))
      .sort()
    return dates[dates.length - 1] ?? null
  }, [vehicle])

  if (!vehicle) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <EmptyState
          icon={Car}
          title="车型不存在"
          description="这个车型可能已被删除，或链接有误。"
          action={
            <Button icon={ArrowLeft} onClick={() => navigate('/garage')}>
              返回车型库
            </Button>
          }
        />
      </div>
    )
  }

  const health = dataHealth([vehicle])
  const quote = info?.quote ?? null
  const breakdown = info?.breakdown ?? computeBreakdown(null, data.settings)
  const discount = discountVsGuide(quote)

  const switchTab = (next: DetailTab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const compareToggle = () => {
    if (!inCompare && data.compareIds.length >= 6) {
      toast('对比清单最多 6 款，请先移除一款。', 'warning')
      return
    }
    dispatch({ type: 'TOGGLE_COMPARE', id: vehicle.id })
  }

  const editGroup: 'base' | 'notes' | 'options' | 'sources' | keyof Vehicle['specs'] =
    tab === 'price' ? 'options' : tab === 'overview' ? 'base' : tab

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/garage" className="inline-flex items-center gap-1.5 text-[11px] text-mist-400 transition hover:text-accent">
          <ArrowLeft className="size-3.5" /> 返回车型库
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={inCompare ? 'secondary' : 'outline'} icon={Columns3} onClick={compareToggle}>
            {inCompare ? '已加入对比' : '加入对比'}
          </Button>
          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
            编辑
          </Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            删除
          </Button>
        </div>
      </div>

      {/* HERO */}
      <section className="panel overflow-hidden">
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          <div className="relative min-h-[230px]">
            <VehicleCover vehicle={vehicle} className="h-full min-h-[230px]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent lg:bg-gradient-to-r" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={vehicle.focusStatus} />
                  {vehicle.keyCandidate ? (
                    <Badge tone="lime">
                      <Star className="size-2.5 fill-current" /> 重点候选
                    </Badge>
                  ) : null}
                  <Badge tone="neutral">{vehicle.bodyType}</Badge>
                  <Badge tone="neutral">{vehicle.energyType}</Badge>
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-mist-400">{vehicle.brand} · {vehicle.year}</div>
                <h1 className="display mt-1 text-[30px] font-semibold text-white sm:text-[36px]">{vehicle.model}</h1>
                <p className="mt-1 text-[12.5px] text-mist-300">{vehicle.trim || '版本待补充'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="label">预计落地价（保守口径）</div>
                  <div className="num mt-1 text-[32px] font-semibold leading-none text-accent">
                    {formatWan(breakdown.landing)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-mist-500">
                    {quote ? (
                      <>
                        <span>指导价 {formatWan(quote.guidePrice)}</span>
                        {discount !== null && discount !== 0 ? (
                          <span className={discount > 0 ? 'text-positive' : 'text-danger'}>
                            {discount > 0 ? '优惠' : '加价'} {formatWan(Math.abs(discount))}
                          </span>
                        ) : null}
                        <span>· {quote.label}</span>
                      </>
                    ) : (
                      <span>尚无报价记录</span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <ScoreRing score={score?.total ?? null} coverage={score?.coverage} size={72} />
                  <div className="mt-1.5 text-[9px] uppercase tracking-wider text-mist-500">综合评分</div>
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-[11.5px] leading-5 text-mist-400">{vehicle.reason || '尚未填写关注原因。'}</p>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  ['CLTC', `${vehicle.specs.powertrain.cltcRange ?? '—'} km`],
                  ['电池', `${vehicle.specs.powertrain.batteryKwh ?? '—'} kWh`],
                  ['轴距', `${vehicle.specs.body.wheelbase ?? '—'} mm`],
                  ['驱动', vehicle.driveType || '待核实'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-line/60 bg-white/[0.015] px-2.5 py-2">
                    <div className="text-[9px] uppercase tracking-wider text-mist-500">{label}</div>
                    <div className="num mt-0.5 truncate text-[11.5px] font-medium text-mist-200">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
              <div className="text-[10px] text-mist-500">
                信息最近核实：{lastVerified ? `${formatDate(lastVerified)}（${daysSince(lastVerified)} 天前）` : '尚未标注'}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="primary" icon={Plus} onClick={() => {
                  setEditingQuote(null)
                  setQuoteOpen(true)
                }}>
                  记录报价
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={BadgeCheck}
                  onClick={() => {
                    setScoreDetailOpen(true)
                  }}
                >
                  评分明细
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TabBar
        tabs={TAB_IDS.map((id) => ({
          id,
          label: TAB_LABELS[id],
          icon:
            id === 'overview' ? <Car className="size-3.5" /> :
            id === 'price' ? <CircleDollarSign className="size-3.5" /> :
            id === 'notes' ? <StickyNote className="size-3.5" /> :
            id === 'sources' ? <Link2 className="size-3.5" /> :
            (() => {
              const Icon = GROUP_ICONS[id] ?? Car
              return <Icon className="size-3.5" />
            })(),
        }))}
        value={tab}
        onChange={switchTab}
      />

      {tab === 'overview' ? (
        <div className="grid gap-5 xl:grid-cols-[1.5fr_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <section className="panel p-4 sm:p-5">
              <SectionTitle
                title="关键参数"
                description="用于快速判断，完整参数在对应标签页；带「待核实」的字段不作为结论依据。"
                action={
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditOpen(true)}>
                    编辑参数
                  </Button>
                }
              />
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <KeyValue label="CLTC 续航" value={`${vehicle.specs.powertrain.cltcRange ?? '待核实'}${vehicle.specs.powertrain.cltcRange ? ' km' : ''}`} />
                <KeyValue label="电池容量" value={`${vehicle.specs.powertrain.batteryKwh ?? '待核实'}${vehicle.specs.powertrain.batteryKwh ? ' kWh' : ''}`} />
                <KeyValue label="电机功率" value={`${vehicle.specs.powertrain.powerKw ?? '待核实'}${vehicle.specs.powertrain.powerKw ? ' kW' : ''}`} />
                <KeyValue label="0–100 km/h" value={`${vehicle.specs.powertrain.accel0100 ?? '待核实'}${vehicle.specs.powertrain.accel0100 ? ' s' : ''}`} />
                <KeyValue label="快充" value={vehicle.specs.powertrain.fastChargeTimeMin ? `${vehicle.specs.powertrain.fastChargeTimeMin} min ${vehicle.specs.powertrain.fastChargeSoc}` : '待核实'} />
                <KeyValue label="高压平台" value={vehicle.specs.powertrain.highVoltage || '待核实'} />
                <KeyValue label="车身尺寸" value={vehicle.specs.body.length ? `${vehicle.specs.body.length}×${vehicle.specs.body.width}×${vehicle.specs.body.height} mm` : '待核实'} />
                <KeyValue label="轴距" value={`${vehicle.specs.body.wheelbase ?? '待核实'}${vehicle.specs.body.wheelbase ? ' mm' : ''}`} />
                <KeyValue label="后备厢 / 前备厢" value={`${vehicle.specs.body.trunkL ?? '—'} / ${vehicle.specs.body.frunkL ?? '—'} L`} />
                <KeyValue label="悬架" value={truncate(`${vehicle.specs.chassis.frontSusp || '待核实'} / ${vehicle.specs.chassis.rearSusp || '待核实'}`, 28)} />
                <KeyValue label="智驾方案" value={truncate(vehicle.specs.adas.solution || '待核实', 28)} />
                <KeyValue label="城市 NOA" value={vehicle.specs.adas.cityNoa || '待核实'} />
              </div>
            </section>

            <section className="panel p-4 sm:p-5">
              <SectionTitle
                title="关注理由与评价"
                description="个人信息，不参与客观参数比较。"
                action={
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => {
                    switchTab('notes')
                    setEditOpen(true)
                  }}>
                    编辑
                  </Button>
                }
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-positive/15 bg-positive/[0.035] p-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-positive">优点</div>
                  <ul className="space-y-1.5">
                    {vehicle.pros.filter(Boolean).length > 0 ? (
                      vehicle.pros.filter(Boolean).map((item) => (
                        <li key={item} className="flex gap-2 text-[11px] leading-5 text-mist-300">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-positive" /> {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-[11px] text-mist-500">尚未填写</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-xl border border-danger/15 bg-danger/[0.035] p-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-danger">缺点 / 顾虑</div>
                  <ul className="space-y-1.5">
                    {vehicle.cons.filter(Boolean).length > 0 ? (
                      vehicle.cons.filter(Boolean).map((item) => (
                        <li key={item} className="flex gap-2 text-[11px] leading-5 text-mist-300">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-danger" /> {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-[11px] text-mist-500">尚未填写</li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                  <div className="label mb-1.5">试驾感受</div>
                  <p className="whitespace-pre-line text-[11px] leading-5 text-mist-400">{vehicle.testDrive || '尚未试驾记录。'}</p>
                </div>
                <div className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                  <div className="label mb-1.5">个人备注</div>
                  <p className="whitespace-pre-line text-[11px] leading-5 text-mist-400">{vehicle.notes || '尚无备注。'}</p>
                </div>
              </div>
            </section>

            <DataCompletenessCard vehicle={vehicle} onEdit={() => setEditOpen(true)} />
          </div>

          <div className="min-w-0 space-y-5">
            <section className="panel p-4 sm:p-5">
              <SectionTitle
                title="落地价构成"
                description="按当前设置与最新报价计算，非官方成交价。"
                action={<Badge tone="amber">估算</Badge>}
              />
              <div className="mt-4 space-y-2.5 text-[11.5px]">
                {[
                  ['车价基准（经销商价优先）', formatWan(breakdown.basePrice)],
                  ['现金优惠', breakdown.cashOff ? `− ${formatWan(breakdown.cashOff)}` : '—'],
                  ['附加条件优惠', breakdown.conditionalOff ? `− ${formatWan(breakdown.conditionalOff)}` : '未计入'],
                  ['预计裸车成交价', formatWan(breakdown.netCar)],
                  ['其他选装', breakdown.optionTotal ? `+ ${formatWan(breakdown.optionTotal)}` : '—'],
                  ['智驾升级包', breakdown.adasPack ? `+ ${formatWan(breakdown.adasPack)}` : '—'],
                  ['购置税', formatWan(breakdown.tax)],
                  ['保险（估算）', formatWan(breakdown.insurance)],
                  ['上牌 / 其他', formatWan(breakdown.plateFee + breakdown.otherFee)],
                  ['置换补贴', breakdown.tradeInSubsidy ? `− ${formatWan(breakdown.tradeInSubsidy)}` : '未计入'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-3">
                    <span className="text-mist-500">{label}</span>
                    <span className="num text-mist-200">{value}</span>
                  </div>
                ))}
                <Divider className="my-2" />
                <div className="flex items-end justify-between gap-3">
                  <span className="text-xs text-mist-300">预计落地价</span>
                  <span className="num text-xl font-semibold text-accent">{formatWan(breakdown.landing)}</span>
                </div>
                {breakdown.budgetDelta !== null ? (
                  <div className="text-right text-[10px] text-mist-500">
                    相对预算上限 {breakdown.budgetDelta > 0 ? '超出' : '低于'} {formatWan(Math.abs(breakdown.budgetDelta))}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 text-[10px] leading-4 text-mist-500">
                {breakdown.taxNote}
                <br />
                {quote?.conditions || '未填写报价适用条件。'}
              </div>
              <Button className="mt-3 w-full" size="sm" variant="secondary" icon={Plus} onClick={() => {
                setEditingQuote(null)
                setQuoteOpen(true)
              }}>
                记录新报价
              </Button>
            </section>

            <ScoreBreakdown vehicle={vehicle} />

            <section className="panel p-4 sm:p-5">
              <SectionTitle title="基础档案" action={<Badge tone="neutral">{health.official} 项官方来源</Badge>} />
              <div className="mt-4 space-y-3 text-[11px]">
                {[
                  ['上市时间', vehicle.specs.basic.launchDate || '待核实'],
                  ['在售状态', vehicle.specs.basic.saleStatus || '待核实'],
                  ['座位数', vehicle.specs.basic.seats ? `${vehicle.specs.basic.seats} 座` : '待核实'],
                  ['平台 / 架构', vehicle.specs.basic.platform || '待核实'],
                  ['质保', vehicle.specs.basic.warranty || '待核实'],
                  ['服务网络', vehicle.specs.basic.serviceNetwork || '待核实'],
                  ['预计残值率', vehicle.specs.basic.residualRate !== null ? formatPercent(vehicle.specs.basic.residualRate, 0) : '待核实'],
                  ['关注日期', formatDate(vehicle.followedAt)],
                  ['最近更新', formatDate(vehicle.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-line/35 pb-2">
                    <span className="shrink-0 text-mist-500">{label}</span>
                    <span className="text-right text-mist-300">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {tab === 'price' ? (
        <div className="grid gap-5 xl:grid-cols-[1.45fr_minmax(0,1fr)]">
          <div className="space-y-5">
            <section className="panel p-4 sm:p-5">
              <SectionTitle
                title="报价记录"
                description="每条报价包含日期、来源、适用条件与可信度。落地价按相同口径计算。"
                action={
                  <Button size="sm" variant="primary" icon={Plus} onClick={() => {
                    setEditingQuote(null)
                    setQuoteOpen(true)
                  }}>
                    新增报价
                  </Button>
                }
              />
              <div className="mt-4 space-y-3">
                {quotes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-[11px] text-mist-500">
                    尚无报价记录。先记录官方指导价，再逐步补充门店报价。
                  </div>
                ) : (
                  quotes.map((item) => {
                    const itemBreakdown = computeBreakdown(item, data.settings)
                    return (
                      <div key={item.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="num text-[11px] text-mist-400">{formatDate(item.date)}</span>
                            <span className="text-[12px] font-medium text-mist-100">{item.label}</span>
                            <VerificationBadge status={item.status} />
                          </div>
                          <div className="flex items-center gap-1">
                            <IconButton
                              label="编辑报价"
                              icon={Pencil}
                              onClick={() => {
                                setEditingQuote(item)
                                setQuoteOpen(true)
                              }}
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <KeyValue label="指导价" value={formatWan(item.guidePrice)} />
                          <KeyValue label="当前价" value={formatWan(item.officialPrice ?? item.dealerPrice)} />
                          <KeyValue label="优惠" value={item.cashDiscount ? formatWan(item.cashDiscount) : '—'} />
                          <KeyValue label="落地估算" value={formatWan(itemBreakdown.landing)} />
                        </div>
                        {item.conditions || item.note ? (
                          <div className="mt-3 space-y-1 text-[10px] leading-4 text-mist-500">
                            {item.conditions ? <p>条件：{item.conditions}</p> : null}
                            {item.note ? <p>备注：{item.note}</p> : null}
                          </div>
                        ) : null}
                        {item.sourceUrl ? (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] text-mist-400 transition hover:text-accent"
                          >
                            <ExternalLink className="size-3" /> {item.sourceLabel || sourceHost(item.sourceUrl)}
                          </a>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section className="panel p-4 sm:p-5">
              <SectionTitle title="价格趋势" description="仅当同一车型有 2 条以上报价时显示趋势线。" />
              <div className="mt-4">
                <PriceTrendChart vehicles={[vehicle]} quotes={quotes} settings={data.settings} height={250} />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="panel p-4 sm:p-5">
              <SectionTitle title="当前落地价明细" action={<Badge tone="blue">{breakdown.policy === 'half' ? '购置税减半' : breakdown.policy === 'exempt' ? '免征' : '全额'}</Badge>} />
              <div className="mt-4 space-y-2 text-[11px]">
                {[
                  ['车价基准', breakdown.basePrice],
                  ['现金优惠', breakdown.cashOff ? -breakdown.cashOff : null],
                  ['附加条件优惠', breakdown.conditionalOff ? -breakdown.conditionalOff : null],
                  ['选装合计', breakdown.optionTotal + breakdown.adasPack || null],
                  ['购置税', breakdown.tax],
                  ['保险', breakdown.insurance],
                  ['上牌/其他', breakdown.plateFee + breakdown.otherFee],
                  ['置换补贴', breakdown.tradeInSubsidy ? -breakdown.tradeInSubsidy : null],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between gap-3 border-b border-line/35 pb-2">
                    <span className="text-mist-500">{label}</span>
                    <span className={cn('num', typeof value === 'number' && value < 0 ? 'text-positive' : 'text-mist-200')}>
                      {typeof value === 'number' ? `${value < 0 ? '−' : ''}${formatWan(Math.abs(value))}` : '未计入'}
                    </span>
                  </div>
                ))}
                <div className="flex items-end justify-between pt-1">
                  <span className="text-xs text-mist-300">预计落地</span>
                  <span className="num text-lg font-semibold text-accent">{formatWan(breakdown.landing)}</span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-[10px] leading-4 text-mist-500">
                {breakdown.missing.length > 0 ? (
                  <p className="flex gap-1.5 text-amber-200/80">
                    <TriangleAlert className="mt-0.5 size-3 shrink-0" /> {breakdown.missing.join('；')}
                  </p>
                ) : null}
                <p>{breakdown.taxNote}</p>
                <p>购置税按计划购车日期 {data.settings.targetPurchaseDate} 与设置中的政策口径估算；实际以开票时政策与目录资格为准。</p>
              </div>
            </section>

            <section className="panel p-4 sm:p-5">
              <SectionTitle title="预算偏差" />
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px] text-mist-500">预算上限 {formatWan(data.settings.budgetMax)}</span>
                  <span className={cn('num text-lg font-semibold', (breakdown.budgetDelta ?? 0) > 0 ? 'text-danger' : 'text-positive')}>
                    {breakdown.budgetDelta === null ? '待核实' : `${breakdown.budgetDelta > 0 ? '+' : ''}${formatWan(breakdown.budgetDelta)}`}
                  </span>
                </div>
                <ProgressBar
                  className="mt-2"
                  value={breakdown.landing ? Math.min(1, breakdown.landing / data.settings.budgetMax) : 0}
                  tone={(breakdown.budgetDelta ?? 0) > 0 ? 'rose' : 'teal'}
                  height="h-2"
                />
                <p className="mt-2 text-[10px] leading-4 text-mist-500">
                  {breakdown.budgetDelta === null
                    ? '需要至少一条有效报价才能计算偏差。'
                    : breakdown.budgetDelta > 0
                      ? '当前估算超过预算上限；可等待优惠、调整版本或重新评估预算。'
                      : '当前估算在预算上限内。'}
                </p>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {tab === 'notes' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="panel p-4 sm:p-5">
            <SectionTitle title="优点与顾虑" action={<Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditOpen(true)}>编辑</Button>} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-positive">优点</div>
                <ul className="space-y-2">
                  {vehicle.pros.filter(Boolean).map((item) => (
                    <li key={item} className="flex gap-2 text-[11px] leading-5 text-mist-300">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-positive" /> {item}
                    </li>
                  ))}
                  {vehicle.pros.filter(Boolean).length === 0 ? <li className="text-[11px] text-mist-500">尚未填写</li> : null}
                </ul>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-danger">缺点</div>
                <ul className="space-y-2">
                  {vehicle.cons.filter(Boolean).map((item) => (
                    <li key={item} className="flex gap-2 text-[11px] leading-5 text-mist-300">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-danger" /> {item}
                    </li>
                  ))}
                  {vehicle.cons.filter(Boolean).length === 0 ? <li className="text-[11px] text-mist-500">尚未填写</li> : null}
                </ul>
              </div>
            </div>
            <Divider className="my-4" />
            <div className="space-y-4">
              <div>
                <div className="label mb-1.5">试驾感受</div>
                <p className="whitespace-pre-line text-[11.5px] leading-5 text-mist-300">{vehicle.testDrive || '尚无记录'}</p>
              </div>
              <div>
                <div className="label mb-1.5">个人备注</div>
                <p className="whitespace-pre-line text-[11.5px] leading-5 text-mist-300">{vehicle.notes || '尚无记录'}</p>
              </div>
              <div>
                <div className="label mb-1.5">淘汰原因</div>
                <p className="whitespace-pre-line text-[11.5px] leading-5 text-mist-300">{vehicle.eliminateReason || '未填写'}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vehicle.tags.map((tag) => (
                  <Badge key={tag} tone="neutral">#{tag}</Badge>
                ))}
              </div>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle title="关注时间线" />
            <div className="mt-4 space-y-3">
              {[
                ['关注车型', vehicle.followedAt, `状态：${vehicle.focusStatus}`],
                ['最近编辑', vehicle.updatedAt.slice(0, 10), `信息版本：${vehicle.year}`],
                ['最近核实', lastVerified ?? '', lastVerified ? `数据来源 ${health.official + health.media} 条` : '尚未标注来源日期'],
                ['加入对比', '', inCompare ? '已加入对比清单' : '未加入对比'],
              ].map(([label, date, detail], index) => (
                <div key={label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 size-2 rounded-full border border-accent/50 bg-accent/20" />
                    {index < 3 ? <span className="mt-1 h-full w-px bg-line/70" /> : null}
                  </div>
                  <div className="pb-4">
                    <div className="text-[11px] text-mist-200">{label}</div>
                    <div className="mt-0.5 text-[10px] text-mist-500">
                      {date ? `${formatDate(date)} · ` : ''}
                      {detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-line/60 bg-white/[0.012] p-3 text-[10px] leading-4 text-mist-500">
              提示：笔记和评分是个人判断，不能替代官方参数与试驾体验。建议每次试驾后更新「试驾感受」和评分。
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'sources' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_1.4fr]">
          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="资料来源"
              description="优先官方配置表与购车页；媒体/经销商仅作交叉验证。"
              action={<Button size="sm" variant="secondary" icon={Plus} onClick={() => setEditOpen(true)}>管理来源</Button>}
            />
            <div className="mt-4 space-y-2.5">
              {vehicle.sources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line-strong px-3 py-8 text-center text-[11px] text-mist-500">
                  还没有来源链接。
                </div>
              ) : (
                vehicle.sources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-line/70 bg-white/[0.012] p-3 transition hover:border-accent/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SourceBadge kind={source.kind} />
                        <span className="text-[11.5px] font-medium text-mist-200">{source.label || '未命名来源'}</span>
                      </div>
                      <ArrowUpRight className="size-3.5 shrink-0 text-mist-500" />
                    </div>
                    <div className="mt-1.5 truncate text-[10px] text-mist-500">
                      {source.publisher ? `${source.publisher} · ` : ''}
                      {source.date ? `${formatDate(source.date)} · ` : ''}
                      {sourceHost(source.url)}
                    </div>
                  </a>
                ))
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['官方', health.official, 'text-teal-300'],
                ['媒体/实测', health.media, 'text-sky-300'],
                ['待核实', health.unverified, 'text-amber-300'],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2">
                  <div className="text-[9px] text-mist-500">{label}</div>
                  <div className={cn('num mt-0.5 text-lg font-semibold', String(color))}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="字段级来源与可信度"
              description="仅显示已填写或已标注来源的字段；空白字段视为信息不足。"
            />
            <div className="mt-4 max-h-[620px] overflow-y-auto pr-1">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="table-head text-left">字段</th>
                    <th className="table-head text-left">当前值</th>
                    <th className="table-head text-left">可信度 / 来源</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_SPEC_FIELDS.filter(({ path }) => {
                    const [g, key] = path.split('.')
                    const value = (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[g]?.[key]
                    return (value !== null && value !== undefined && value !== '' && value !== '待核实') || vehicle.provenance[path]
                  }).map(({ path, group, field }) => {
                    const [g, key] = path.split('.')
                    const value = (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[g]?.[key]
                    return (
                      <tr key={path}>
                        <td className="table-cell text-mist-400">
                          <span className="text-[9px] text-mist-600">{group.short}</span>
                          <div>{field.label}</div>
                        </td>
                        <td className="table-cell text-mist-200">{formatSpecValue(field, value)}</td>
                        <td className="table-cell">
                          <ProvenanceLine vehicle={vehicle} path={path} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {['basic', 'powertrain', 'body', 'chassis', 'comfort', 'adas', 'safety'].includes(tab) ? (
        <div className="space-y-4">
          <SpecGroupPanel vehicle={vehicle} groupId={tab as keyof Vehicle['specs']} onEdit={() => setEditOpen(true)} />
          {tab !== 'adas' ? (
            <div className="panel p-4 text-[10.5px] leading-5 text-mist-500">
              参数口径提示：续航为 CLTC 工况，实际受温度、车速、空调与驾驶习惯影响；充电时间需统一 SOC 区间后再比较；官方宣传的「多少分钟补能多少公里」不能与 10–80% 时间直接横比。
            </div>
          ) : (
            <div className="panel p-4 text-[10.5px] leading-5 text-mist-500">
              智驾提示：硬件标配不等于功能已开通，城市 NOA 可能依赖选装包、软件订阅或特定城市范围。比较时请同时看「硬件标配/选装」「软件费用」「开通条件」三行。
            </div>
          )}
        </div>
      ) : null}

      <VehicleFormModal open={editOpen} vehicle={vehicle} initialGroup={editGroup} onClose={() => setEditOpen(false)} />

      <QuoteFormModal
        open={quoteOpen}
        vehicleId={vehicle.id}
        quote={editingQuote}
        onClose={() => {
          setQuoteOpen(false)
          setEditingQuote(null)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="删除这款车型？"
        description={`将删除「${vehicle.brand} ${vehicle.model}」及其 ${quotes.length} 条报价记录，且无法撤销。建议先到数据管理导出完整备份。`}
        confirmLabel="确认删除"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_VEHICLE', id: vehicle.id })
          toast('车型已删除', 'info')
          navigate('/garage')
        }}
      />

      <Modal
        open={scoreDetailOpen}
        onClose={() => setScoreDetailOpen(false)}
        title={`评分明细 · ${vehicle.brand} ${vehicle.model}`}
        description="个人偏好模型，不是客观车辆质量排名。"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line/70 bg-white/[0.012] p-4">
            <ScoreRing score={score?.total ?? null} coverage={score?.coverage} size={84} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-mist-100">
                {score?.total != null ? `${score.total.toFixed(2)} / 10` : '信息不足'}
              </div>
              <div className="mt-1 text-[11px] text-mist-500">
                数据覆盖度 {score ? Math.round(score.coverage * 100) : 0}% · {data.scoring.mode === 'manual' ? '手动评分' : '自动评分'}
              </div>
              <div className="mt-1 text-[10px] text-mist-500">
                权重：{SCORE_DIMS.map((d) => `${d.short} ${((data.scoring.weights[d.id] / Math.max(1, Object.values(data.scoring.weights).reduce((a, b) => a + b, 0))) * 100).toFixed(0)}%`).join(' · ')}
              </div>
            </div>
          </div>
          {SCORE_DIMS.map((dim) => {
            const item = score?.dims[dim.id as ScoreDimId]
            if (!item) return null
            return (
              <div key={dim.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11.5px] font-medium text-mist-200">{dim.label}</span>
                  <span className="num text-sm font-semibold text-mist-100">
                    {item.score !== null ? item.score.toFixed(1) : '信息不足'}
                  </span>
                </div>
                {item.basis ? <p className="mt-1.5 text-[10.5px] leading-5 text-mist-500">{item.basis}</p> : null}
                {item.missing && item.missing.length > 0 ? (
                  <p className="mt-1 text-[10px] text-amber-200/70">缺失：{item.missing.join('、')}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
