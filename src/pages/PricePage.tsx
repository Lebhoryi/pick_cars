import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Calendar,
  CircleDollarSign,
  ExternalLink,
  Plus,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import type { PriceQuote, Vehicle } from '@/types'
import { useApp } from '@/store/AppStore'
import { cn, formatDate, formatWan, isNum } from '@/lib/format'
import { computeBreakdown, discountVsGuide, quotesForVehicle } from '@/lib/price'
import { priceMovements, vehicleName } from '@/lib/analytics'
import { TAX_POLICY_URL } from '@/data/seed'
import { taxPolicyShort } from '@/lib/tax'
import { Badge, Button, EmptyState, IconButton, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { QuoteFormModal } from '@/components/price/QuoteFormModal'
import { PriceTrendChart } from '@/components/charts/Charts'
import { StatusBadge, VehicleCover, VerificationBadge } from '@/components/vehicle/VehicleVisuals'

export function PricePage() {
  const { data, priceMap, dispatch, toast } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteVehicleId, setQuoteVehicleId] = useState<string>('')
  const [editingQuote, setEditingQuote] = useState<PriceQuote | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const focusId = searchParams.get('vehicle') ?? data.vehicles.find((v) => data.quotes.some((q) => q.vehicleId === v.id))?.id ?? data.vehicles[0]?.id
  const focusVehicle = data.vehicles.find((v) => v.id === focusId) ?? null

  const infos = data.vehicles.map((vehicle) => ({ vehicle, info: priceMap[vehicle.id] }))
  const landings = infos.map((item) => item.info?.breakdown.landing).filter((v): v is number => isNum(v))
  const minLanding = landings.length > 0 ? Math.min(...landings) : null
  const maxLanding = landings.length > 0 ? Math.max(...landings) : null
  const totalQuotes = data.quotes.length
  const pendingQuotes = data.quotes.filter((q) => q.status === '待核实').length
  const discounts = data.quotes
    .map((q) => discountVsGuide(q))
    .filter((v): v is number => isNum(v) && v > 0)
  const avgDiscount = discounts.length > 0 ? discounts.reduce((a, b) => a + b, 0) / discounts.length : null

  const movements = useMemo(() => priceMovements(data.vehicles, data.quotes, data.settings), [data.vehicles, data.quotes, data.settings])

  const chartVehicles = useMemo(() => {
    const preferred = [
      ...(focusVehicle ? [focusVehicle] : []),
      ...data.compareIds.map((id) => data.vehicles.find((v) => v.id === id)).filter((v): v is Vehicle => Boolean(v)),
    ]
    const unique = preferred.filter((vehicle, index) => preferred.findIndex((v) => v.id === vehicle.id) === index)
    const fallback = unique.length > 0 ? unique : data.vehicles
    return fallback.slice(0, 6)
  }, [data.compareIds, data.vehicles, focusVehicle])

  const focusQuotes = focusVehicle ? quotesForVehicle(data.quotes, focusVehicle.id) : []
  const focusInfo = focusVehicle ? priceMap[focusVehicle.id] : null
  const policy = focusInfo?.breakdown.policy ?? 'half'

  const openNew = (vehicleId: string) => {
    setQuoteVehicleId(vehicleId)
    setEditingQuote(null)
    setQuoteOpen(true)
    setPickerOpen(false)
  }

  const openEdit = (quote: PriceQuote) => {
    setQuoteVehicleId(quote.vehicleId)
    setEditingQuote(quote)
    setQuoteOpen(true)
  }

  const selectVehicle = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('vehicle', id)
    setSearchParams(next, { replace: true })
  }

  if (data.vehicles.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={CircleDollarSign}
          title="还没有车型可以记录价格"
          description="先添加车型，再记录官方指导价、门店报价与落地价。"
          action={<Button onClick={() => dispatch({ type: 'RESET_SEED' })}>恢复示例数据</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="价格追踪"
        subtitle="把官方指导价、门店报价、现金优惠、附加条件、置换补贴与选装/智驾包分开记录。落地价统一按「保守口径」估算，避免把有条件优惠当成无条件降价。"
        meta={
          <>
            <Badge tone="teal" dot>
              {totalQuotes} 条报价
            </Badge>
            <Badge tone="amber">{pendingQuotes} 条待核实</Badge>
            <Badge tone="neutral">单位：万元</Badge>
          </>
        }
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setPickerOpen(true)}>
            记录报价
          </Button>
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: '最低预计落地',
            value: formatWan(minLanding),
            sub: minLanding ? '保守口径 · 未计置换' : '尚无有效报价',
            icon: Wallet,
          },
          {
            label: '落地价区间',
            value: minLanding && maxLanding ? `${(minLanding / 10000).toFixed(1)}–${(maxLanding / 10000).toFixed(1)} 万` : '待核实',
            sub: `${landings.length} / ${data.vehicles.length} 款可计算`,
            icon: TrendingDown,
          },
          {
            label: '平均价格优惠',
            value: formatWan(avgDiscount),
            sub: '指导价 − 净车价（含现金优惠）',
            icon: CircleDollarSign,
          },
          {
            label: '最近更新',
            value: data.quotes.length > 0 ? formatDate([...data.quotes].sort((a, b) => b.date.localeCompare(a.date))[0].date) : '—',
            sub: `政策：${taxPolicyShort(policy)}`,
            icon: Calendar,
          },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="label">{item.label}</span>
              <item.icon className="size-3.5 text-mist-500" />
            </div>
            <div className="num mt-2.5 text-[20px] font-semibold leading-none text-mist-100">{item.value}</div>
            <div className="mt-1.5 text-[10px] text-mist-500">{item.sub}</div>
          </div>
        ))}
      </section>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_minmax(0,1fr)]">
        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title="价格趋势"
            description="按报价日期串联预计落地价。不同车型的保险/上牌默认值可能不同，趋势更适合看同车型自身变化。"
            action={<Badge tone="neutral">最多 6 款</Badge>}
          />
          <div className="mt-4">
            <PriceTrendChart
              vehicles={chartVehicles}
              quotes={data.quotes}
              settings={data.settings}
              height={270}
            />
          </div>
          <div className="mt-2 text-[9.5px] text-mist-500">
            展示车型：{chartVehicles.map((v) => vehicleName(v)).join(' · ')}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title="购置税口径"
            description="纯电车型不默认免税；按计划购车日期与届时政策计算。"
            action={<Badge tone="blue">{taxPolicyShort(policy)}</Badge>}
          />
          <div className="mt-4 space-y-3 text-[11px] leading-5 text-mist-400">
            <div className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-mist-300">计划购车日期</span>
                <span className="num text-mist-100">{formatDate(data.settings.targetPurchaseDate)}</span>
              </div>
              <div className="mt-1.5 text-[10px] text-mist-500">
                当前口径：2026–2027 年新能源乘用车减半征收，减税额上限 1.5 万元/辆；2028 年起按全额 10% 估算。
              </div>
            </div>
            <p>
              计税价格按含增值税成交价 ÷ 1.13 × 税率估算，未考虑地方补贴、车型目录资格变化与开票时间差异。
            </p>
            <a
              href={TAX_POLICY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10.5px] text-mist-400 transition hover:text-accent"
            >
              <ExternalLink className="size-3" /> 查看官方政策原文
            </a>
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.04] px-3 py-2 text-[10px] leading-4 text-amber-100/70">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              这是估算工具，不是税务意见；实际税额以开票时有效政策与车辆资格为准。
            </div>
          </div>
        </section>
      </div>

      <section className="panel mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-mist-100">最新报价一览</h2>
            <p className="mt-0.5 text-[10px] text-mist-500">点击行查看该车型的报价历史；右侧按钮可直接新增或编辑。</p>
          </div>
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setPickerOpen(true)}>
            新增报价
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1060px]">
            <thead>
              <tr>
                <th className="table-head text-left">车型 / 版本</th>
                <th className="table-head text-left">最新报价</th>
                <th className="table-head text-right">指导价</th>
                <th className="table-head text-right">当前价</th>
                <th className="table-head text-right">优惠</th>
                <th className="table-head text-right">选装/智驾</th>
                <th className="table-head text-right">预计落地</th>
                <th className="table-head text-right">预算偏差</th>
                <th className="table-head text-center">可信度</th>
                <th className="table-head text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {infos.map(({ vehicle, info }) => {
                const quote = info?.quote
                const discount = discountVsGuide(quote)
                const selected = focusVehicle?.id === vehicle.id
                return (
                  <tr
                    key={vehicle.id}
                    onClick={() => selectVehicle(vehicle.id)}
                    className={cn('cursor-pointer', selected && 'bg-accent/[0.035]')}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <VehicleCover vehicle={vehicle} compact className="h-10 w-14 shrink-0 rounded-md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[12px] font-medium text-mist-100">
                              {vehicle.brand} {vehicle.model}
                            </span>
                            {vehicle.keyCandidate ? <Badge tone="lime">重点</Badge> : null}
                          </div>
                          <div className="mt-0.5 truncate text-[9.5px] text-mist-500">{vehicle.year} · {vehicle.trim}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      {quote ? (
                        <>
                          <div className="num text-[11px] text-mist-200">{formatDate(quote.date)}</div>
                          <div className="text-[9.5px] text-mist-500">{quote.label}</div>
                        </>
                      ) : (
                        <span className="text-[10.5px] text-mist-500">尚无报价</span>
                      )}
                    </td>
                    <td className="table-cell num text-right text-mist-300">{formatWan(quote?.guidePrice)}</td>
                    <td className="table-cell num text-right text-mist-200">{formatWan(quote?.officialPrice ?? quote?.dealerPrice)}</td>
                    <td className="table-cell text-right">
                      {discount !== null && discount !== 0 ? (
                        <span className={cn('num text-[11px]', discount > 0 ? 'text-positive' : 'text-danger')}>
                          {discount > 0 ? '−' : '+'}
                          {formatWan(Math.abs(discount))}
                        </span>
                      ) : (
                        <span className="text-[10px] text-mist-600">—</span>
                      )}
                    </td>
                    <td className="table-cell num text-right text-mist-300">
                      {quote ? ((quote.optionTotal ?? 0) + (quote.adasPack ?? 0) > 0 ? formatWan((quote.optionTotal ?? 0) + (quote.adasPack ?? 0)) : '—') : '—'}
                    </td>
                    <td className="table-cell text-right">
                      <span className={cn('num text-[13px] font-semibold', info?.breakdown.landing ? 'text-accent' : 'text-mist-500')}>
                        {formatWan(info?.breakdown.landing)}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      {info?.breakdown.budgetDelta !== null && info?.breakdown.budgetDelta !== undefined ? (
                        <span className={cn('num text-[10.5px]', info.breakdown.budgetDelta > 0 ? 'text-danger' : 'text-positive')}>
                          {info.breakdown.budgetDelta > 0 ? '+' : ''}
                          {formatWan(info.breakdown.budgetDelta)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-mist-600">—</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {quote ? <VerificationBadge status={quote.status} /> : <Badge tone="neutral">待核实</Badge>}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                        <Button size="xs" variant="ghost" icon={Plus} onClick={() => openNew(vehicle.id)}>
                          报价
                        </Button>
                        {quote ? <IconButton label="编辑最新报价" icon={Receipt} onClick={() => openEdit(quote)} /> : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {focusVehicle ? (
        <div className="grid gap-5 xl:grid-cols-[1.3fr_minmax(0,1fr)]">
          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title={`${vehicleName(focusVehicle)} · 报价历史`}
              description="同一车型可记录多个时间点；落地价按每条报价的优惠与选装条件分别计算。"
              action={
                <Button size="sm" variant="primary" icon={Plus} onClick={() => openNew(focusVehicle.id)}>
                  新增报价
                </Button>
              }
            />
            <div className="mt-4 space-y-3">
              {focusQuotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-[11px] text-mist-500">
                  尚无报价。先记录官方指导价，再补充门店报价。
                </div>
              ) : (
                focusQuotes.map((quote) => {
                  const breakdown = computeBreakdown(quote, data.settings)
                  return (
                    <div key={quote.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="num text-[11px] text-mist-400">{formatDate(quote.date)}</span>
                          <span className="text-[12px] font-medium text-mist-100">{quote.label}</span>
                          <VerificationBadge status={quote.status} />
                        </div>
                        <Button size="xs" variant="ghost" onClick={() => openEdit(quote)}>
                          编辑
                        </Button>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[10.5px] sm:grid-cols-4">
                        <div><span className="text-mist-500">指导价</span><div className="num mt-0.5 text-mist-200">{formatWan(quote.guidePrice)}</div></div>
                        <div><span className="text-mist-500">当前价</span><div className="num mt-0.5 text-mist-200">{formatWan(quote.officialPrice ?? quote.dealerPrice)}</div></div>
                        <div><span className="text-mist-500">现金优惠</span><div className="num mt-0.5 text-mist-200">{quote.cashDiscount ? formatWan(quote.cashDiscount) : '—'}</div></div>
                        <div><span className="text-mist-500">预计落地</span><div className="num mt-0.5 font-medium text-accent">{formatWan(breakdown.landing)}</div></div>
                      </div>
                      {(quote.conditions || quote.note || quote.limitedDiscount) ? (
                        <div className="mt-2.5 space-y-1 border-t border-line/40 pt-2 text-[10px] leading-4 text-mist-500">
                          {quote.limitedDiscount ? <p>另记限时优惠：{formatWan(quote.limitedDiscount)}（信息项，不重复扣减）</p> : null}
                          {quote.conditions ? <p>适用条件：{quote.conditions}</p> : null}
                          {quote.note ? <p>备注：{quote.note}</p> : null}
                        </div>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                        {quote.sourceUrl ? (
                          <a
                            href={quote.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[9.5px] text-mist-400 hover:text-accent"
                          >
                            <ExternalLink className="size-2.5" /> {quote.sourceLabel || quote.sourceUrl}
                          </a>
                        ) : (
                          <span className="text-[9.5px] text-mist-600">未填写来源链接</span>
                        )}
                        <span className="text-[9px] text-mist-600">
                          {quote.includeTradeIn ? '已计置换' : '未计置换'} · {quote.includeConditional ? '已计附加条件' : '未计附加条件'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <div className="space-y-5">
            <section className="panel p-4 sm:p-5">
              <SectionTitle title="当前落地价构成" action={<Badge tone="blue">{taxPolicyShort(policy)}</Badge>} />
              {focusInfo ? (
                <div className="mt-4 space-y-2 text-[11px]">
                  {[
                    ['车价基准', focusInfo.breakdown.basePrice],
                    ['现金优惠', focusInfo.breakdown.cashOff ? -focusInfo.breakdown.cashOff : null],
                    ['附加条件优惠', focusInfo.breakdown.conditionalOff ? -focusInfo.breakdown.conditionalOff : null],
                    ['预计裸车成交价', focusInfo.breakdown.netCar],
                    ['选装 + 智驾包', focusInfo.breakdown.optionTotal + focusInfo.breakdown.adasPack || null],
                    ['购置税', focusInfo.breakdown.tax],
                    ['保险 + 上牌 + 其他', focusInfo.breakdown.insurance + focusInfo.breakdown.plateFee + focusInfo.breakdown.otherFee],
                    ['置换补贴', focusInfo.breakdown.tradeInSubsidy ? -focusInfo.breakdown.tradeInSubsidy : null],
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
                    <span className="num text-lg font-semibold text-accent">{formatWan(focusInfo.breakdown.landing)}</span>
                  </div>
                  <p className="pt-1 text-[9.5px] leading-4 text-mist-500">{focusInfo.breakdown.taxNote}</p>
                </div>
              ) : (
                <p className="mt-4 text-[11px] text-mist-500">尚无报价。</p>
              )}
            </section>

            <section className="panel p-4 sm:p-5">
              <SectionTitle title="价格变动" description="同车型相邻两次报价的落地价差。" />
              <div className="mt-4 space-y-2">
                {movements.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-[10.5px] text-mist-500">
                    暂无连续报价。记录第 2 次报价后会出现变动。
                  </div>
                ) : (
                  movements.slice(0, 6).map((movement) => (
                    <div key={`${movement.quoteId}-${movement.fromDate}`} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[10.5px] text-mist-300">{movement.vehicleName}</div>
                        <div className="text-[9px] text-mist-500">{formatDate(movement.fromDate)} → {formatDate(movement.toDate)}</div>
                      </div>
                      <span className={cn('num text-[11px] font-medium', movement.delta > 0 ? 'text-danger' : 'text-positive')}>
                        {movement.delta > 0 ? '+' : ''}
                        {formatWan(movement.delta)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="panel p-4 sm:p-5">
              <SectionTitle title="口径提醒" />
              <div className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-mist-500">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300/70" />
                <span>
                  经销商报价视为优惠前价格；若报价单已含优惠，请把现金优惠填 0，避免重复扣减。附加条件优惠与置换补贴默认不计入保守落地价，可在报价中手动勾选。
                </span>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <QuoteFormModal
        open={quoteOpen}
        vehicleId={quoteVehicleId || focusVehicle?.id || data.vehicles[0].id}
        quote={editingQuote}
        onClose={() => {
          setQuoteOpen(false)
          setEditingQuote(null)
        }}
      />

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="选择要记录报价的车型"
        description="选择后会打开报价表单；已有报价会被预填，方便记录新的时间点。"
        size="md"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {data.vehicles.map((vehicle) => {
            const info = priceMap[vehicle.id]
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => openNew(vehicle.id)}
                className="flex items-center gap-3 rounded-xl border border-line/70 bg-white/[0.012] p-2.5 text-left transition hover:border-accent/35 hover:bg-white/[0.025]"
              >
                <VehicleCover vehicle={vehicle} compact className="h-11 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] font-medium text-mist-100">{vehicle.brand} {vehicle.model}</div>
                  <div className="truncate text-[9.5px] text-mist-500">{vehicle.trim}</div>
                  <div className="mt-0.5 text-[9.5px] text-accent">{formatWan(info?.breakdown.landing)} 落地</div>
                </div>
                <Plus className="size-4 shrink-0 text-mist-500" />
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
