import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  Check,
  Download,
  Gauge,
  Info,
  RotateCcw,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import type { CostResult, Vehicle } from '@/types'
import { useApp } from '@/store/AppStore'
import { cn, formatWan } from '@/lib/format'
import { defaultCostAssumptions } from '@/lib/defaults'
import { computeCost } from '@/lib/cost'
import { dataHealth, vehicleName } from '@/lib/analytics'
import { costCsv, downloadText } from '@/lib/csv'
import { Badge, Button, EmptyState, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { NumberInput, SliderField } from '@/components/ui/Field'
import { CostCurveChart } from '@/components/charts/Charts'
import { VehicleCover } from '@/components/vehicle/VehicleVisuals'

export function CostPage() {
  const { data, priceMap, dispatch, toast } = useApp()
  const assumptions = data.settings.cost
  const [overrides, setOverrides] = useState<Record<string, number | null>>({})
  const [selected, setSelected] = useState<string[]>(() => {
    const key = data.vehicles.filter((v) => v.keyCandidate).map((v) => v.id)
    const base = key.length > 0 ? key : data.vehicles.slice(0, 4).map((v) => v.id)
    return base.slice(0, 6)
  })

  const updateCost = (patch: Partial<typeof assumptions>) => {
    dispatch({
      type: 'SET_SETTINGS',
      settings: { ...data.settings, cost: { ...assumptions, ...patch } },
    })
  }

  const vehicles = data.vehicles
  const withOverride = (vehicle: Vehicle): Vehicle => {
    const override = overrides[vehicle.id]
    if (override === undefined) return vehicle
    if (override === null) return { ...vehicle, specs: { ...vehicle.specs, powertrain: { ...vehicle.specs.powertrain, consumption: null } } }
    return { ...vehicle, specs: { ...vehicle.specs, powertrain: { ...vehicle.specs.powertrain, consumption: override } } }
  }

  const costMap = useMemo(() => {
    const map: Record<string, CostResult> = {}
    for (const vehicle of vehicles) map[vehicle.id] = computeCost(withOverride(vehicle), priceMap[vehicle.id], assumptions)
    return map
  }, [vehicles, priceMap, assumptions, overrides])

  const complete = vehicles.filter((v) => costMap[v.id]?.total !== null)
  const sorted = [...vehicles].sort((a, b) => (costMap[a.id]?.total ?? Infinity) - (costMap[b.id]?.total ?? Infinity))
  const totals = complete.map((v) => costMap[v.id].total as number)
  const minTotal = totals.length > 0 ? Math.min(...totals) : null
  const maxTotal = totals.length > 0 ? Math.max(...totals) : null
  const bestPerKm = [...complete].sort((a, b) => (costMap[a.id].perKm ?? Infinity) - (costMap[b.id].perKm ?? Infinity))[0] ?? null
  const chartVehicles = selected.map((id) => vehicles.find((v) => v.id === id)).filter((v): v is Vehicle => Boolean(v))
  const health = dataHealth(vehicles)

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      if (prev.length >= 6) {
        toast('成本曲线最多同时展示 6 款车型。', 'warning')
        return prev
      }
      return [...prev, id]
    })
  }

  const exportCsv = () => {
    const rows = sorted.map((vehicle) => {
      const cost = costMap[vehicle.id]
      return {
        name: `${vehicle.brand} ${vehicle.model} ${vehicle.trim}`,
        purchase: cost.purchase === null ? '' : String(Math.round(cost.purchase)),
        energy: String(Math.round(cost.energyTotal)),
        insurance: String(Math.round(cost.insuranceTotal)),
        maintenance: String(Math.round(cost.maintenanceTotal + cost.tiresTotal + cost.repairTotal)),
        total: cost.total === null ? '' : String(Math.round(cost.total)),
        perKm: cost.perKm === null ? '' : cost.perKm.toFixed(2),
      }
    })
    downloadText(`carfleet-cost-${new Date().toISOString().slice(0, 10)}.csv`, costCsv(rows), 'text/csv;charset=utf-8')
    toast('用车成本已导出 CSV', 'success')
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={Calculator}
          title="还没有车型可以测算"
          description="先添加车型并记录报价，再回来比较长期持有成本。"
          action={<Button onClick={() => dispatch({ type: 'RESET_SEED' })}>恢复示例数据</Button>}
        />
      </div>
    )
  }

  const blended = assumptions.homeChargeRatio * assumptions.homePrice + (1 - assumptions.homeChargeRatio) * assumptions.publicPrice

  return (
    <div>
      <PageHeader
        title="用车成本"
        subtitle="在相同年限、里程与能源价格假设下比较购车与持有成本。所有假设都可以修改，用于回答「买得起」之外的问题：长期用起来到底差多少。"
        meta={
          <>
            <Badge tone="teal" dot>
              {assumptions.years} 年 · {assumptions.annualKm.toLocaleString('zh-CN')} km/年
            </Badge>
            <Badge tone="neutral">家充 {Math.round(assumptions.homeChargeRatio * 100)}%</Badge>
            <Badge tone="neutral">电价 {assumptions.homePrice} / {assumptions.publicPrice} 元/kWh</Badge>
          </>
        }
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv}>
            导出 CSV
          </Button>
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: '最低 5 年总成本',
            value: minTotal !== null ? formatWan(minTotal) : '待核实',
            sub: complete.length > 0 ? `${complete.length} 款可完整测算` : '需要先记录落地价',
            icon: Wallet,
          },
          {
            label: '最高与最低差距',
            value: minTotal !== null && maxTotal !== null ? formatWan(maxTotal - minTotal) : '待核实',
            sub: '相同假设下的总成本差',
            icon: TrendingDown,
          },
          {
            label: '每公里最低',
            value: bestPerKm && costMap[bestPerKm.id].perKm !== null ? `¥${costMap[bestPerKm.id].perKm?.toFixed(2)}` : '待核实',
            sub: bestPerKm ? vehicleName(bestPerKm) : '尚无完整数据',
            icon: Gauge,
          },
          {
            label: '综合电价',
            value: `${blended.toFixed(2)} 元/kWh`,
            sub: '按家充/公共充电比例加权',
            icon: Calculator,
          },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="label">{item.label}</span>
              <item.icon className="size-3.5 text-mist-500" />
            </div>
            <div className="num mt-2.5 text-[21px] font-semibold leading-none text-mist-100">{item.value}</div>
            <div className="mt-1.5 text-[10px] text-mist-500">{item.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[326px_minmax(0,1fr)]">
        {/* ASSUMPTIONS */}
        <aside className="space-y-5">
          <section className="panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-mist-100">假设参数</h2>
                <p className="mt-0.5 text-[10px] text-mist-500">修改后立即重算，并保存到本机。</p>
              </div>
              <Button
                size="xs"
                variant="ghost"
                icon={RotateCcw}
                onClick={() => {
                  dispatch({ type: 'SET_SETTINGS', settings: { ...data.settings, cost: { ...defaultCostAssumptions } } })
                  toast('已恢复默认成本假设', 'info')
                }}
              >
                默认
              </Button>
            </div>

            <div className="mt-5 space-y-5">
              <SliderField
                label="持有年限"
                value={assumptions.years}
                min={1}
                max={10}
                step={1}
                onChange={(value) => updateCost({ years: value })}
                format={(value) => `${value} 年`}
              />
              <SliderField
                label="年行驶里程"
                value={assumptions.annualKm}
                min={3000}
                max={40000}
                step={1000}
                onChange={(value) => updateCost({ annualKm: value })}
                format={(value) => `${value.toLocaleString('zh-CN')} km`}
              />
              <SliderField
                label="家充比例"
                value={Math.round(assumptions.homeChargeRatio * 100)}
                min={0}
                max={100}
                step={5}
                onChange={(value) => updateCost({ homeChargeRatio: value / 100 })}
                format={(value) => `${value}%`}
                hint="其余为公共快充/第三方充电"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">家充电价</div>
                  <NumberInput value={assumptions.homePrice} onChange={(v) => updateCost({ homePrice: v ?? 0.5 })} unit="元/kWh" step={0.05} min={0} max={5} />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">公共电价</div>
                  <NumberInput value={assumptions.publicPrice} onChange={(v) => updateCost({ publicPrice: v ?? 1.2 })} unit="元/kWh" step={0.05} min={0} max={10} />
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] text-mist-300">默认电耗（车型缺失时使用）</div>
                <NumberInput value={assumptions.defaultConsumption} onChange={(v) => updateCost({ defaultConsumption: v ?? 15 })} unit="kWh/100km" step={0.1} min={5} max={40} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">年保险</div>
                  <NumberInput value={assumptions.insuranceAnnual} onChange={(v) => updateCost({ insuranceAnnual: v ?? 0 })} unit="元" step={100} min={0} />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">年保养</div>
                  <NumberInput value={assumptions.maintenanceAnnual} onChange={(v) => updateCost({ maintenanceAnnual: v ?? 0 })} unit="元" step={100} min={0} />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">年轮胎</div>
                  <NumberInput value={assumptions.tiresAnnual} onChange={(v) => updateCost({ tiresAnnual: v ?? 0 })} unit="元" step={100} min={0} />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">年维修</div>
                  <NumberInput value={assumptions.repairAnnual} onChange={(v) => updateCost({ repairAnnual: v ?? 0 })} unit="元" step={100} min={0} />
                </div>
              </div>
              <SliderField
                label="5 年残值率"
                value={assumptions.residualRate}
                min={0}
                max={80}
                step={1}
                onChange={(value) => updateCost({ residualRate: value })}
                format={(value) => `${value}%`}
              />
              <SliderField
                label="资金机会成本"
                value={assumptions.opportunityRate}
                min={0}
                max={10}
                step={0.5}
                onChange={(value) => updateCost({ opportunityRate: value })}
                format={(value) => `${value}% / 年`}
                hint="按购车款占用资金计算，未考虑贷款利息"
              />
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle title="计算口径" />
            <div className="mt-3 space-y-2 text-[10px] leading-4 text-mist-500">
              <p>购车落地 = 车价 − 现金优惠 + 选装/智驾包 + 购置税 + 首年保险 + 上牌杂费（与价格追踪口径一致）。</p>
              <p>持有成本 = 能源 + 第 2 年起保险 + 保养 + 轮胎 + 维修 + 资金机会成本 − 残值。</p>
              <p>残值优先使用车型的「预计 5 年残值率」，缺失时使用全局假设。</p>
              <p>不含停车、路桥、违章、家充桩安装与贷款利息。</p>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 text-[9.5px] leading-4 text-mist-500">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              不同车型比较时，年限、里程、能源价格与残值率假设保持一致；只有车型电耗/落地价等个体参数不同。
            </div>
          </section>
        </aside>

        {/* RESULTS */}
        <div className="min-w-0 space-y-5">
          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="累计持有成本曲线"
              description="含购车款，末期扣除残值。点击车型标签切换曲线。"
              action={<Badge tone="neutral">{selected.length} / 6</Badge>}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vehicles.map((vehicle) => {
                const active = selected.includes(vehicle.id)
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => toggleSelected(vehicle.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition',
                      active ? 'border-accent/45 bg-accent/10 text-accent' : 'border-line/70 text-mist-500 hover:text-mist-300',
                    )}
                  >
                    {active ? <Check className="size-2.5" /> : <span className="size-1.5 rounded-full" style={{ background: vehicle.accent }} />}
                    {vehicle.model}
                  </button>
                )
              })}
            </div>
            <div className="mt-4">
              <CostCurveChart vehicles={chartVehicles} costs={costMap} height={280} />
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-mist-100">车型持有成本对比</h2>
                <p className="mt-0.5 text-[10px] text-mist-500">按 {assumptions.years} 年、{assumptions.annualKm.toLocaleString('zh-CN')} km/年 计算；电耗可临时调整。</p>
              </div>
              <Badge tone="neutral">数据来源 {health.official + health.media} 项 · 待核实 {health.unverified}</Badge>
            </div>
            <div className="space-y-2 p-3 sm:hidden">
              {sorted.map((vehicle) => {
                const cost = costMap[vehicle.id]
                const isCheapest = cost.total !== null && cost.total === minTotal
                return (
                  <Link
                    key={vehicle.id}
                    to={`/garage/${vehicle.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-2.5 transition',
                      isCheapest ? 'border-accent/35 bg-accent/[0.04]' : 'border-line/70 bg-white/[0.012]',
                    )}
                  >
                    <VehicleCover vehicle={vehicle} compact className="h-12 w-16 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11.5px] font-medium text-mist-100">{vehicle.brand} {vehicle.model}</div>
                      <div className="mt-0.5 text-[9px] text-mist-500">{vehicle.trim}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-mist-500">
                        <span>落地 {formatWan(cost.purchase, 1)}</span>
                        <span>· 年均 {formatWan(cost.perYear, 1)}</span>
                        <span>· 每公里 {cost.perKm !== null ? `¥${cost.perKm.toFixed(2)}` : '待核实'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={cn('num text-[13px] font-semibold', isCheapest ? 'text-accent' : 'text-mist-100')}>
                        {formatWan(cost.total, 1)}
                      </div>
                      <div className="text-[9px] text-mist-500">{assumptions.years} 年总成本</div>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="data-table min-w-[920px]">
                <thead>
                  <tr>
                    <th className="table-head text-left">车型</th>
                    <th className="table-head text-right">购车落地</th>
                    <th className="table-head text-center">电耗</th>
                    <th className="table-head text-right">年能源</th>
                    <th className="table-head text-right">{assumptions.years} 年总成本</th>
                    <th className="table-head text-right">每公里</th>
                    <th className="table-head text-right">相对最低</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((vehicle) => {
                    const cost = costMap[vehicle.id]
                    const isCheapest = cost.total !== null && cost.total === minTotal
                    const delta = cost.total !== null && minTotal !== null ? cost.total - minTotal : null
                    return (
                      <tr key={vehicle.id}>
                        <td className="table-cell">
                          <div className="flex items-center gap-2.5">
                            <VehicleCover vehicle={vehicle} compact className="h-10 w-14 shrink-0 rounded-md" />
                            <div className="min-w-0">
                              <Link to={`/garage/${vehicle.id}`} className="truncate text-[11.5px] font-medium text-mist-100 hover:text-accent">
                                {vehicle.brand} {vehicle.model}
                              </Link>
                              <div className="truncate text-[9px] text-mist-500">{vehicle.trim}</div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell num text-right text-mist-200">{formatWan(cost.purchase, 1)}</td>
                        <td className="table-cell text-center">
                          <NumberInput
                            value={overrides[vehicle.id] ?? vehicle.specs.powertrain.consumption}
                            onChange={(value) => setOverrides((prev) => ({ ...prev, [vehicle.id]: value }))}
                            min={5}
                            max={40}
                            step={0.1}
                            className="h-8 w-20 px-2 py-0 text-center text-[10.5px]"
                          />
                          <div className="mt-0.5 text-[8.5px] text-mist-600">
                            {overrides[vehicle.id] !== undefined ? '临时调整' : cost.consumptionEstimated ? '默认值' : '车型参数'}
                          </div>
                        </td>
                        <td className="table-cell num text-right text-mist-300">{formatWan(cost.energyPerYear, 1)}</td>
                        <td className="table-cell text-right">
                          <span className={cn('num text-[14px] font-semibold', isCheapest ? 'text-accent' : 'text-mist-100')}>
                            {formatWan(cost.total, 1)}
                          </span>
                          {isCheapest ? <span className="ml-1.5 rounded bg-accent/15 px-1 py-0.5 text-[8px] text-accent">最低</span> : null}
                          <div className="mt-0.5 text-[9px] text-mist-500">年均 {formatWan(cost.perYear, 1)}</div>
                        </td>
                        <td className="table-cell num text-right text-mist-300">
                          {cost.perKm !== null ? `¥${cost.perKm.toFixed(2)}` : '待核实'}
                        </td>
                        <td className="table-cell text-right">
                          {delta === null ? (
                            <span className="text-[10px] text-mist-500">待核实</span>
                          ) : delta === 0 ? (
                            <span className="text-[10px] text-accent">基准</span>
                          ) : (
                            <span className="num text-[10.5px] text-mist-400">+{formatWan(delta, 1)}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line/60 px-4 py-2.5 text-[9.5px] leading-4 text-mist-500 sm:px-5">
              电耗输入框是临时 what-if 调整，不写入车型参数；如需长期保存，请到车型详情编辑「百公里电耗」。
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="成本结构明细"
              description="以最低总成本车型为基准，展示各项成本的差异来源。"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.slice(0, 6).map((vehicle) => {
                const cost = costMap[vehicle.id]
                const base = minTotal !== null && cost.total !== null ? cost.total - minTotal : null
                return (
                  <div key={vehicle.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-mist-200">{vehicleName(vehicle)}</span>
                      <span className={cn('num text-[11px]', cost.total !== null && cost.total === minTotal ? 'text-accent' : 'text-mist-400')}>
                        {formatWan(cost.total, 1)}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-[9.5px] text-mist-500">
                      <div className="flex justify-between"><span>购车落地</span><span className="num">{formatWan(cost.purchase, 1)}</span></div>
                      <div className="flex justify-between"><span>{assumptions.years} 年能源</span><span className="num">{formatWan(cost.energyTotal, 1)}</span></div>
                      <div className="flex justify-between"><span>保险（2 年起）</span><span className="num">{formatWan(cost.insuranceTotal, 1)}</span></div>
                      <div className="flex justify-between"><span>保养/轮胎/维修</span><span className="num">{formatWan(cost.maintenanceTotal + cost.tiresTotal + cost.repairTotal, 1)}</span></div>
                      <div className="flex justify-between"><span>机会成本</span><span className="num">{formatWan(cost.opportunityCost, 1)}</span></div>
                      <div className="flex justify-between"><span>折旧（购车−残值）</span><span className="num">{formatWan(cost.purchase !== null ? cost.purchase - cost.residualValue : null, 1)}</span></div>
                      <div className="flex justify-between text-positive"><span>− 残值</span><span className="num">{formatWan(cost.residualValue, 1)}</span></div>
                      <div className="flex justify-between border-t border-line/50 pt-1 text-mist-300"><span>年均综合</span><span className="num">{formatWan(cost.perYear, 1)}</span></div>
                      {base !== null ? (
                        <div className="flex justify-between border-t border-line/50 pt-1 text-mist-400">
                          <span>相对最低</span>
                          <span className="num">{base === 0 ? '基准' : `+${formatWan(base, 1)}`}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
