import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownWideNarrow, Check, Columns3, Download, EyeOff, Info, MoveHorizontal, RotateCcw, X } from 'lucide-react'
import type { ScoreResult, Vehicle } from '@/types'
import { useApp } from '@/store/AppStore'
import { cn, formatWan } from '@/lib/format'
import { computeBreakdown } from '@/lib/price'
import { computeCost } from '@/lib/cost'
import { SPEC_GROUPS, formatSpecValue } from '@/data/specSchema'
import { Badge, Button, EmptyState, InfoTip, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { VehicleCover } from '@/components/vehicle/VehicleVisuals'
import { downloadText, compareCsv } from '@/lib/csv'

type SortKey = 'manual' | 'price' | 'range' | 'wheelbase' | 'power' | 'score'
type ValueFormat = 'money' | 'text' | 'config' | 'number' | 'percent'

interface CompareValue {
  display: string
  numeric: number | null
  missing: boolean
}

interface CompareRow {
  id: string
  group: string
  label: string
  values: CompareValue[]
  prefer: 'higher' | 'lower' | 'yes' | 'none'
  format: ValueFormat
  hint?: string
}

const GROUPS = [
  '购车价格及落地成本',
  '续航能力',
  '充电速度',
  '三电技术',
  '智驾硬件',
  '智驾软件能力',
  '底盘与操控',
  '隔音与舒适性',
  '前排舒适性',
  '后排空间及舒适性',
  '座舱与车机',
  '安全配置',
  '能耗与长期使用成本',
  '品牌、售后与质保',
  '保值率及未来二手车风险',
]

const CONFIG_RANK: Record<string, number> = {
  标配: 3,
  选装: 2,
  '选装（需付费）': 2,
  有: 2,
  无: 1,
  待核实: 0,
}

function configTone(value: string): 'teal' | 'amber' | 'neutral' {
  if (value.startsWith('标配') || value === '有') return 'teal'
  if (value.startsWith('选装')) return 'amber'
  return 'neutral'
}

function isMissing(raw: unknown): boolean {
  return raw === null || raw === undefined || raw === '' || raw === '待核实'
}

export function ComparePage() {
  const { data, priceMap, scoresResult, dispatch, toast } = useApp()
  const [sort, setSort] = useState<SortKey>('manual')
  const [hideSame, setHideSame] = useState(false)

  const vehicles = data.vehicles
  const selected = data.compareIds
    .map((id) => vehicles.find((vehicle) => vehicle.id === id))
    .filter((vehicle): vehicle is Vehicle => Boolean(vehicle))

  const ordered = useMemo(() => {
    const list = [...selected]
    if (sort === 'price') list.sort((a, b) => (priceMap[a.id]?.breakdown.landing ?? Infinity) - (priceMap[b.id]?.breakdown.landing ?? Infinity))
    if (sort === 'range') list.sort((a, b) => (b.specs.powertrain.cltcRange ?? -1) - (a.specs.powertrain.cltcRange ?? -1))
    if (sort === 'wheelbase') list.sort((a, b) => (b.specs.body.wheelbase ?? -1) - (a.specs.body.wheelbase ?? -1))
    if (sort === 'power') list.sort((a, b) => (b.specs.powertrain.powerKw ?? -1) - (a.specs.powertrain.powerKw ?? -1))
    if (sort === 'score') list.sort((a, b) => (scoresResult.scores[b.id]?.total ?? -1) - (scoresResult.scores[a.id]?.total ?? -1))
    return list
  }, [selected, sort, priceMap, scoresResult.scores])

  const rows = useMemo(
    () => buildRows(ordered, priceMap, scoresResult.scores, data.settings),
    [ordered, priceMap, scoresResult.scores, data.settings],
  )
  const visibleRows = useMemo(
    () => (hideSame ? rows.filter((row) => new Set(row.values.map((value) => value.display)).size > 1) : rows),
    [rows, hideSame],
  )

  const toggle = (id: string) => {
    const exists = data.compareIds.includes(id)
    if (!exists && data.compareIds.length >= 6) {
      toast('对比清单最多 6 款，请先移除一款。', 'warning')
      return
    }
    dispatch({ type: 'TOGGLE_COMPARE', id })
  }

  const selectKeyCandidates = () => {
    const ids = vehicles.filter((v) => v.keyCandidate).map((v) => v.id).slice(0, 6)
    dispatch({ type: 'SET_COMPARE_IDS', ids })
    toast(`已选择 ${ids.length} 款重点候选`, 'info')
  }

  const exportCsv = () => {
    if (ordered.length < 2) {
      toast('至少选择 2 款车型后再导出。', 'warning')
      return
    }
    const content = compareCsv(
      ordered,
      visibleRows.map((row) => ({
        group: row.group,
        label: row.label,
        values: row.values.map((value) => value.display),
      })),
    )
    downloadText(`carfleet-compare-${new Date().toISOString().slice(0, 10)}.csv`, content, 'text/csv;charset=utf-8')
    toast('对比表已导出 CSV', 'success')
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={Columns3}
          title="还没有可对比的车型"
          description="先到车型库添加车型，或恢复初始示例数据。"
          action={<Button onClick={() => dispatch({ type: 'RESET_SEED' })}>恢复示例数据</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="车型对比"
        subtitle="同一参数横向排列，统一单位与口径。最优/较优基于数值机械计算，不代表真实体验；配置更多也不等于更好。"
        meta={
          <>
            <Badge tone="teal" dot>
              已选 {selected.length} / 6
            </Badge>
            <Badge tone="neutral">15 个维度</Badge>
            <Badge tone="neutral">缺失数据显示「待核实」</Badge>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={ordered.length < 2}>
              导出 CSV
            </Button>
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={() => {
                dispatch({ type: 'SET_COMPARE_IDS', ids: [] })
                toast('已清空对比清单', 'info')
              }}
            >
              清空
            </Button>
          </>
        }
      />

      <section className="panel mb-5 p-4 sm:p-5">
        <SectionTitle
          title="选择 2–6 款车型"
          description="选择会保存在本机，下次打开自动恢复。重点候选优先展示。"
          action={
            <Button size="sm" variant="ghost" onClick={selectKeyCandidates}>
              选择全部重点候选
            </Button>
          }
        />
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {[...vehicles]
            .sort((a, b) => Number(b.keyCandidate) - Number(a.keyCandidate) || (scoresResult.scores[b.id]?.total ?? -1) - (scoresResult.scores[a.id]?.total ?? -1))
            .map((vehicle) => {
              const active = data.compareIds.includes(vehicle.id)
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => toggle(vehicle.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition',
                    active
                      ? 'border-accent/45 bg-accent/[0.06]'
                      : 'border-line/70 bg-white/[0.012] hover:border-line-strong hover:bg-white/[0.025]',
                  )}
                >
                  <VehicleCover vehicle={vehicle} compact className="h-12 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11.5px] font-medium text-mist-100">
                        {vehicle.brand} {vehicle.model}
                      </span>
                      {vehicle.keyCandidate ? <Badge tone="lime">重点</Badge> : null}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-mist-500">{vehicle.trim || '版本待补充'}</div>
                    <div className="mt-1 flex items-center gap-2 text-[9.5px] text-mist-500">
                      <span>{formatWan(priceMap[vehicle.id]?.breakdown.landing)}</span>
                      <span>·</span>
                      <span>评分 {scoresResult.scores[vehicle.id]?.total?.toFixed(1) ?? '—'}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border',
                      active ? 'border-accent bg-accent text-ink-950' : 'border-line-strong text-transparent',
                    )}
                  >
                    <Check className="size-3" />
                  </span>
                </button>
              )
            })}
        </div>
      </section>

      {selected.length < 2 ? (
        <EmptyState
          icon={Columns3}
          title="再选一款就能开始对比"
          description="勾选 2–6 款车型后，这里会出现按 15 个维度分组的对比表。也可以直接在车型库的卡片上点击对比图标。"
          action={
            <Button variant="primary" onClick={selectKeyCandidates}>
              选择重点候选
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-mist-500">
                <ArrowDownWideNarrow className="size-3.5" /> 列排序
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="field h-8 w-auto py-0 text-[11px]"
                aria-label="对比列排序"
              >
                <option value="manual">手动选择顺序</option>
                <option value="price">落地价从低到高</option>
                <option value="range">CLTC 续航从高到低</option>
                <option value="wheelbase">轴距从大到小</option>
                <option value="power">功率从高到低</option>
                <option value="score">综合评分从高到低</option>
              </select>
              <button
                type="button"
                onClick={() => setHideSame((value) => !value)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] transition',
                  hideSame
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-line-strong text-mist-400 hover:text-mist-200',
                )}
              >
                <EyeOff className="size-3.5" /> 隐藏无差异
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[9.5px] text-mist-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-accent/70" /> 最优
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-sky-400/50" /> 较优
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm border border-line-strong" /> 待核实
              </span>
              <InfoTip align="right" text="最优/较优只按该行数值机械判断（价格越低、续航越高），没有考虑配置组合、实际体验与个人偏好。请结合试驾与评分模型解读。">
                <button type="button" className="inline-flex items-center gap-1 text-mist-500 hover:text-accent">
                  <Info className="size-3" /> 口径说明
                </button>
              </InfoTip>
            </div>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3.5 py-2.5 text-[10.5px] leading-5 text-amber-100/75">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              配置数量不等于体验更好。选装硬件与标配功能分开标识；智驾硬件是否标配、软件是否收费、功能开通范围，比「有没有」更值得关注。缺失数据不会被当作 0 分，也不会参与最优/较优判断。
            </span>
          </div>

          <div className="mb-2 flex items-center gap-1.5 text-[10px] text-mist-500 sm:hidden">
            <MoveHorizontal className="size-3" /> 表格可横向滑动查看全部车型；首列为参数名，固定显示
          </div>
          <div className="panel overflow-hidden">
            <div className="max-h-[78vh] overflow-auto scroll-shadow">
              <table className="data-table min-w-[880px]" style={{ minWidth: `${260 + ordered.length * 210}px` }}>
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 top-0 z-30 min-w-[150px] border-b border-line bg-ink-850 px-4 py-3 text-left sm:min-w-[230px]">
                      <span className="label">参数 / 车型</span>
                    </th>
                    {ordered.map((vehicle) => (
                      <th
                        key={vehicle.id}
                        className="min-w-[200px] border-b border-l border-line/70 bg-ink-850 px-3 py-2.5 text-left align-top"
                      >
                        <div className="flex items-start gap-2">
                          <VehicleCover vehicle={vehicle} compact className="h-10 w-14 shrink-0 rounded-md" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11.5px] font-semibold text-mist-100">
                              {vehicle.brand} {vehicle.model}
                            </div>
                            <div className="truncate text-[9px] text-mist-500">{vehicle.trim || '版本待补充'}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="num text-[10px] text-accent">{formatWan(priceMap[vehicle.id]?.breakdown.landing)}</span>
                              <span className="text-[9px] text-mist-500">· {scoresResult.scores[vehicle.id]?.total?.toFixed(1) ?? '—'} 分</span>
                              {priceMap[vehicle.id]?.quote?.status === '待核实' ? <Badge tone="amber">价格待核实</Badge> : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggle(vehicle.id)}
                            aria-label="移出对比"
                            className="flex size-5 shrink-0 items-center justify-center rounded text-mist-500 hover:bg-white/5 hover:text-danger"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map((group) => {
                    const groupRows = visibleRows.filter((row) => row.group === group)
                    if (groupRows.length === 0) return null
                    return (
                      <Fragment key={group}>
                        <tr>
                          <td
                            colSpan={ordered.length + 1}
                            className="sticky left-0 bg-ink-800/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent/80 backdrop-blur"
                          >
                            {group}
                          </td>
                        </tr>
                        {groupRows.map((row) => {
                          const { best, second } = rankRow(row)
                          return (
                            <tr key={row.id}>
                              <td className="sticky left-0 z-[4] min-w-[150px] border-b border-line/40 bg-ink-850 px-4 py-2.5 align-top sm:min-w-[230px]">
                                <div className="text-[11px] text-mist-300">{row.label}</div>
                                {row.hint ? <div className="mt-0.5 text-[9px] leading-3 text-mist-600">{row.hint}</div> : null}
                              </td>
                              {row.values.map((value, index) => {
                                const isBest = best.has(index)
                                const isSecond = second.has(index)
                                return (
                                  <td
                                    key={ordered[index].id}
                                    className={cn(
                                      'border-b border-l border-line/35 px-3 py-2.5 align-top text-[11px]',
                                      isBest && 'bg-accent/[0.07]',
                                      isSecond && 'bg-sky-400/[0.035]',
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'flex items-center gap-1.5',
                                        value.missing ? 'text-mist-600' : isBest ? 'font-medium text-accent' : 'text-mist-200',
                                      )}
                                    >
                                      {value.missing ? (
                                        <span>待核实</span>
                                      ) : row.format === 'config' ? (
                                        <Badge tone={configTone(value.display)}>{value.display}</Badge>
                                      ) : (
                                        <span className="num leading-5">{value.display}</span>
                                      )}
                                      {isBest ? (
                                        <span className="rounded bg-accent/15 px-1 py-0.5 text-[8px] font-semibold text-accent">最优</span>
                                      ) : isSecond ? (
                                        <span className="rounded bg-sky-400/10 px-1 py-0.5 text-[8px] text-sky-300">较优</span>
                                      ) : null}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {visibleRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-mist-500">
                当前车型在所有参数上都没有差异（或全部待核实）。关闭「隐藏无差异」可查看完整表格。
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-mist-500">
            <span>共 {visibleRows.length} 行参数 · 单位已统一为 km / kW / N·m / mm / L / 万元</span>
            <Link to="/score" className="text-mist-400 transition hover:text-accent">
              调整个人权重与评分 →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function rankRow(row: CompareRow): { best: Set<number>; second: Set<number> } {
  const best = new Set<number>()
  const second = new Set<number>()
  if (row.prefer === 'none') return { best, second }
  const entries = row.values
    .map((value, index) => ({ index, numeric: value.numeric, missing: value.missing }))
    .filter((entry) => !entry.missing && entry.numeric !== null)
  if (entries.length < 2) return { best, second }
  if (new Set(entries.map((entry) => entry.numeric)).size < 2) return { best, second }
  const sorted = [...entries].sort((a, b) =>
    row.prefer === 'lower' ? (a.numeric as number) - (b.numeric as number) : (b.numeric as number) - (a.numeric as number),
  )
  const top = sorted[0].numeric as number
  sorted.filter((entry) => entry.numeric === top).forEach((entry) => best.add(entry.index))
  const secondValue = sorted.find((entry) => entry.numeric !== top)?.numeric
  if (secondValue !== undefined) {
    sorted.filter((entry) => entry.numeric === secondValue).forEach((entry) => second.add(entry.index))
  }
  return { best, second }
}

function buildRows(
  vehicles: Vehicle[],
  priceMap: ReturnType<typeof useApp>['priceMap'],
  scores: Record<string, ScoreResult>,
  settings: ReturnType<typeof useApp>['data']['settings'],
): CompareRow[] {
  const rows: CompareRow[] = []

  const add = (
    group: string,
    label: string,
    values: Array<number | string | boolean | null>,
    prefer: CompareRow['prefer'],
    format: ValueFormat,
    formatter?: (value: number | string | boolean) => string,
    hint?: string,
  ) => {
    const mapped = values.map((raw) => {
      const missing = isMissing(raw)
      let numeric: number | null = null
      if (!missing) {
        if (typeof raw === 'number') numeric = raw
        else if (typeof raw === 'boolean') numeric = raw ? 1 : 0
        else if (format === 'config' && typeof raw === 'string') numeric = CONFIG_RANK[raw] ?? null
      }
      let display: string
      if (missing) display = '待核实'
      else if (formatter) display = formatter(raw as string | number | boolean)
      else if (format === 'money' && typeof raw === 'number') display = formatWan(raw)
      else if (format === 'percent' && typeof raw === 'number') display = `${raw}%`
      else if (typeof raw === 'boolean') display = raw ? '有' : '无'
      else display = String(raw)
      return { display, numeric, missing }
    })
    rows.push({ id: `${group}-${label}`, group, label, values: mapped, prefer, format, hint })
  }

  const spec = (group: string, path: string, prefer: CompareRow['prefer'] = 'none', format?: ValueFormat) => {
    const fieldRef = SPEC_GROUPS.flatMap((g) => g.fields.map((f) => ({ group: g.id, field: f }))).find(
      (item) => `${item.group}.${item.field.key}` === path,
    )
    if (!fieldRef) return
    const values = vehicles.map((vehicle) => {
      const [g, key] = path.split('.')
      return (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[g]?.[key] as
        | number
        | string
        | boolean
        | null
        | undefined
    })
    add(
      group,
      fieldRef.field.label,
      values.map((v) => (v === undefined ? null : v)),
      prefer,
      format ?? 'text',
      fieldRef.field.type === 'number' ? (value) => formatSpecValue(fieldRef.field, value) : undefined,
      fieldRef.field.unit ? `单位：${fieldRef.field.unit}` : fieldRef.field.hint,
    )
  }

  const quote = (vehicle: Vehicle) => priceMap[vehicle.id]?.quote ?? null
  const breakdown = (vehicle: Vehicle) => priceMap[vehicle.id]?.breakdown ?? computeBreakdown(null, settings)
  const cost = (vehicle: Vehicle) => computeCost(vehicle, priceMap[vehicle.id], settings.cost)

  add('购车价格及落地成本', '官方指导价', vehicles.map((v) => quote(v)?.guidePrice ?? null), 'lower', 'money')
  add('购车价格及落地成本', '当前官方价', vehicles.map((v) => quote(v)?.officialPrice ?? null), 'lower', 'money')
  add('购车价格及落地成本', '经销商报价', vehicles.map((v) => quote(v)?.dealerPrice ?? null), 'lower', 'money')
  add('购车价格及落地成本', '限时优惠（信息项）', vehicles.map((v) => quote(v)?.limitedDiscount ?? null), 'none', 'money')
  add('购车价格及落地成本', '现金优惠', vehicles.map((v) => quote(v)?.cashDiscount ?? null), 'higher', 'money')
  add('购车价格及落地成本', '附加条件优惠', vehicles.map((v) => quote(v)?.conditionalDiscount ?? null), 'higher', 'money')
  add('购车价格及落地成本', '置换补贴', vehicles.map((v) => quote(v)?.tradeInSubsidy ?? null), 'higher', 'money')
  add('购车价格及落地成本', '选装 + 智驾包', vehicles.map((v) => (quote(v)?.optionTotal ?? 0) + (quote(v)?.adasPack ?? 0)), 'lower', 'money')
  add('购车价格及落地成本', '预计裸车成交价', vehicles.map((v) => breakdown(v).netCar), 'lower', 'money')
  add('购车价格及落地成本', '购置税（估算）', vehicles.map((v) => breakdown(v).tax), 'lower', 'money', undefined, '按计划购车日期与政策自动计算')
  add('购车价格及落地成本', '保险 + 上牌', vehicles.map((v) => breakdown(v).insurance + breakdown(v).plateFee + breakdown(v).otherFee), 'lower', 'money')
  add('购车价格及落地成本', '预计落地价', vehicles.map((v) => breakdown(v).landing), 'lower', 'money', undefined, '保守口径，未计未勾选的附加优惠/置换')
  add(
    '购车价格及落地成本',
    '预算偏差',
    vehicles.map((v) => breakdown(v).budgetDelta),
    'lower',
    'money',
    (value) => (typeof value === 'number' ? `${value > 0 ? '+' : ''}${formatWan(value)}` : '待核实'),
    '负数表示低于预算上限',
  )

  spec('续航能力', 'powertrain.cltcRange', 'higher')
  spec('续航能力', 'powertrain.batteryKwh', 'higher')
  spec('续航能力', 'powertrain.consumption', 'lower')
  spec('续航能力', 'powertrain.realRangeSummer', 'higher')
  spec('续航能力', 'powertrain.realRangeWinter', 'higher')
  add(
    '续航能力',
    '每万元续航',
    vehicles.map((v) => {
      const landing = breakdown(v).landing
      const range = v.specs.powertrain.cltcRange
      return landing && range ? Math.round((range / (landing / 10000)) * 10) / 10 : null
    }),
    'higher',
    'number',
    (value) => `${value} km/万元`,
  )

  spec('充电速度', 'powertrain.highVoltage')
  spec('充电速度', 'powertrain.peakChargeKw', 'higher')
  spec('充电速度', 'powertrain.fastChargeTimeMin', 'lower')
  spec('充电速度', 'powertrain.fastChargeSoc')
  spec('充电速度', 'powertrain.thermalMgmt')
  spec('充电速度', 'powertrain.batteryPreheat', 'yes')

  spec('三电技术', 'powertrain.batteryBrand')
  spec('三电技术', 'powertrain.batteryType')
  spec('三电技术', 'powertrain.motorCount', 'higher')
  spec('三电技术', 'powertrain.powerKw', 'higher')
  spec('三电技术', 'powertrain.torqueNm', 'higher')
  spec('三电技术', 'powertrain.accel0100', 'lower')
  spec('三电技术', 'powertrain.topSpeed', 'higher')
  spec('三电技术', 'powertrain.v2lKw', 'higher')

  spec('智驾硬件', 'adas.solution')
  spec('智驾硬件', 'adas.supplier')
  spec('智驾硬件', 'adas.chip')
  spec('智驾硬件', 'adas.tops', 'higher')
  spec('智驾硬件', 'adas.lidar', 'higher')
  spec('智驾硬件', 'adas.lidarSpec')
  spec('智驾硬件', 'adas.cameras', 'higher')
  spec('智驾硬件', 'adas.radars', 'higher')
  spec('智驾硬件', 'adas.ultrasonic', 'higher')
  spec('智驾硬件', 'adas.hardware', 'none', 'config')

  spec('智驾软件能力', 'adas.highSpeedNoa', 'higher', 'config')
  spec('智驾软件能力', 'adas.cityNoa', 'higher', 'config')
  spec('智驾软件能力', 'adas.autoPark', 'higher', 'config')
  spec('智驾软件能力', 'adas.coverage')
  spec('智驾软件能力', 'adas.softwareFee')
  spec('智驾软件能力', 'adas.subscription')
  spec('智驾软件能力', 'adas.upgrade')
  spec('智驾软件能力', 'adas.experience')

  spec('底盘与操控', 'chassis.frontSusp')
  spec('底盘与操控', 'chassis.rearSusp')
  spec('底盘与操控', 'chassis.suspMaterial')
  spec('底盘与操控', 'chassis.damping')
  spec('底盘与操控', 'chassis.airSusp', 'yes')
  spec('底盘与操控', 'chassis.roadPreview', 'yes')
  spec('底盘与操控', 'chassis.tire')
  spec('底盘与操控', 'chassis.brake')
  spec('底盘与操控', 'chassis.turningRadius', 'lower')
  spec('底盘与操控', 'chassis.rigidity', 'higher')
  spec('底盘与操控', 'chassis.tuning')

  spec('隔音与舒适性', 'comfort.acousticGlass')
  spec('隔音与舒适性', 'comfort.audioBrand')
  spec('隔音与舒适性', 'comfort.speakers', 'higher')
  spec('隔音与舒适性', 'comfort.climate')
  spec('隔音与舒适性', 'comfort.rearVent', 'yes')
  spec('隔音与舒适性', 'comfort.sunshade', 'yes')
  spec('隔音与舒适性', 'comfort.fridge', 'yes')
  spec('隔音与舒适性', 'comfort.rearScreen', 'yes')

  spec('前排舒适性', 'comfort.seatMaterial')
  spec('前排舒适性', 'comfort.driverAdjust')
  spec('前排舒适性', 'comfort.passengerAdjust')
  spec('前排舒适性', 'comfort.seatMemory')
  spec('前排舒适性', 'comfort.seatHeat', 'yes')
  spec('前排舒适性', 'comfort.seatVent', 'yes')
  spec('前排舒适性', 'comfort.seatMassage', 'yes')

  spec('后排空间及舒适性', 'body.wheelbase', 'higher')
  spec('后排空间及舒适性', 'body.rearLegroom', 'higher')
  spec('后排空间及舒适性', 'body.rearHeadroom', 'higher')
  spec('后排空间及舒适性', 'body.rearWidth', 'higher')
  spec('后排空间及舒适性', 'body.trunkL', 'higher')
  spec('后排空间及舒适性', 'body.trunkMaxL', 'higher')
  spec('后排空间及舒适性', 'body.frunkL', 'higher')
  spec('后排空间及舒适性', 'comfort.rearComfort')
  spec('后排空间及舒适性', 'body.seatFold')

  spec('座舱与车机', 'comfort.chip')
  spec('座舱与车机', 'comfort.screen')
  spec('座舱与车机', 'comfort.hud')
  spec('座舱与车机', 'comfort.os')
  spec('座舱与车机', 'comfort.phoneLink')
  spec('座舱与车机', 'comfort.ota')

  spec('安全配置', 'safety.airbags', 'higher')
  spec('安全配置', 'safety.aeb')
  spec('安全配置', 'safety.structure')
  spec('安全配置', 'safety.batterySafety')
  spec('安全配置', 'safety.note')

  spec('能耗与长期使用成本', 'powertrain.consumption', 'lower')
  add('能耗与长期使用成本', '年均能源费用', vehicles.map((v) => Math.round(cost(v).energyPerYear)), 'lower', 'money')
  add('能耗与长期使用成本', `${settings.cost.years} 年总持有成本`, vehicles.map((v) => cost(v).total), 'lower', 'money', undefined, '含购车、能源、保险、保养、机会成本并扣除残值')
  add('能耗与长期使用成本', '年均综合成本', vehicles.map((v) => cost(v).perYear), 'lower', 'money', undefined, '总持有成本 ÷ 持有年限')
  add('能耗与长期使用成本', '每公里综合成本', vehicles.map((v) => { const perKm = cost(v).perKm; return perKm === null ? null : Math.round(perKm * 100) / 100 }), 'lower', 'number', (value) => `¥${value} /km`)

  spec('品牌、售后与质保', 'basic.warranty')
  spec('品牌、售后与质保', 'basic.serviceNetwork')
  spec('品牌、售后与质保', 'basic.saleStatus')
  spec('品牌、售后与质保', 'basic.platform')
  add('品牌、售后与质保', '驱动形式', vehicles.map((v) => v.driveType || null), 'none', 'text')

  spec('保值率及未来二手车风险', 'basic.residualRate', 'higher')
  add(
    '保值率及未来二手车风险',
    '预计 5 年残值',
    vehicles.map((v) => {
      const landing = breakdown(v).landing
      const rate = v.specs.basic.residualRate
      return landing && rate !== null ? Math.round(landing * (rate / 100)) : null
    }),
    'higher',
    'money',
    undefined,
    '按个人估算残值率计算，不是二手车平台报价',
  )
  add(
    '保值率及未来二手车风险',
    '风险判断',
    vehicles.map((v) => {
      const rate = v.specs.basic.residualRate
      if (rate === null) return '待核实'
      if (rate >= 50) return '较低（估算）'
      if (rate >= 42) return '中等（估算）'
      return '偏高（估算）'
    }),
    'none',
    'text',
  )

  for (const row of rows) {
    if (row.group !== '购车价格及落地成本') continue
    row.values = row.values.map((value, index) =>
      quote(vehicles[index])?.status === '待核实' ? { ...value, numeric: null } : value,
    )
  }

  const dashWhenZero = new Set(['现金优惠', '附加条件优惠', '置换补贴', '选装 + 智驾包', '限时优惠（信息项）'])
  for (const row of rows) {
    if (!dashWhenZero.has(row.label)) continue
    row.values = row.values.map((value) =>
      value.display === '0.00 万' ? { display: '—', numeric: null, missing: false } : value,
    )
  }

  return rows
}
