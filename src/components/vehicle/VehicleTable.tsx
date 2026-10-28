import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, Columns2, Pencil } from 'lucide-react'
import type { FilterResult, ScoreResult, Vehicle, VehiclePriceInfo } from '@/types'
import { cn, formatWan } from '@/lib/format'
import { useApp } from '@/store/AppStore'
import { Badge, IconButton } from '@/components/ui/primitives'
import { StatusBadge, VehicleCover } from '@/components/vehicle/VehicleVisuals'

export function VehicleTable({
  vehicles,
  priceMap,
  scores,
  filters,
  onEdit,
}: {
  vehicles: Vehicle[]
  priceMap: Record<string, VehiclePriceInfo>
  scores: Record<string, ScoreResult>
  filters: Record<string, FilterResult>
  onEdit: (vehicle: Vehicle) => void
}) {
  const navigate = useNavigate()
  const { data, dispatch, toast } = useApp()

  const toggleCompare = (id: string) => {
    const exists = data.compareIds.includes(id)
    if (!exists && data.compareIds.length >= 6) {
      toast('对比清单最多 6 款，请先移除一款。', 'warning')
      return
    }
    dispatch({ type: 'TOGGLE_COMPARE', id })
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[980px]">
          <thead>
            <tr>
              <th className="table-head sticky left-0 z-10 bg-ink-850 text-left">车型 / 版本</th>
              <th className="table-head text-left">关注状态</th>
              <th className="table-head text-right">指导价</th>
              <th className="table-head text-right">预计落地</th>
              <th className="table-head text-right">CLTC</th>
              <th className="table-head text-left">智驾方案</th>
              <th className="table-head text-right">综合评分</th>
              <th className="table-head text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => {
              const info = priceMap[vehicle.id]
              const score = scores[vehicle.id]
              const inCompare = data.compareIds.includes(vehicle.id)
              return (
                <tr
                  key={vehicle.id}
                  className="cursor-pointer transition"
                  onClick={() => navigate(`/garage/${vehicle.id}`)}
                >
                  <td
                    className="table-cell sticky left-0 z-[4] bg-ink-850"
                    style={{ boxShadow: '1px 0 0 rgba(43,59,82,.5)' }}
                  >
                    <div className="flex items-center gap-3">
                      <VehicleCover vehicle={vehicle} compact className="h-11 w-16 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-mist-100">
                            {vehicle.brand} {vehicle.model}
                          </span>
                          {vehicle.keyCandidate ? <Badge tone="lime">重点</Badge> : null}
                        </div>
                        <div className="mt-0.5 truncate text-[10.5px] text-mist-500">
                          {vehicle.year} · {vehicle.trim || '版本待补充'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={vehicle.focusStatus} />
                  </td>
                  <td className="table-cell num text-right text-mist-300">
                    {formatWan(info?.quote?.guidePrice ?? null)}
                  </td>
                  <td className="table-cell text-right">
                    <div className={cn('num font-semibold', info?.breakdown.landing ? 'text-accent' : 'text-mist-500')}>
                      {info?.breakdown.landing ? formatWan(info.breakdown.landing) : '待核实'}
                    </div>
                    {filters[vehicle.id]?.status === 'fail' ? (
                      <div className="mt-0.5 text-[9.5px] text-danger">超硬性条件</div>
                    ) : null}
                  </td>
                  <td className="table-cell num text-right text-mist-200">
                    {vehicle.specs.powertrain.cltcRange ? `${vehicle.specs.powertrain.cltcRange} km` : '—'}
                  </td>
                  <td className="table-cell max-w-[220px]">
                    <div className="truncate text-[11.5px] text-mist-300" title={vehicle.specs.adas.solution}>
                      {vehicle.specs.adas.solution || '待核实'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-mist-500">
                      城市 NOA {vehicle.specs.adas.cityNoa || '待核实'}
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <div className="num inline-flex items-baseline gap-1 text-[15px] font-semibold text-mist-100">
                      {score?.total?.toFixed(2) ?? '—'}
                      <span className="text-[9px] font-normal text-mist-500">/10</span>
                    </div>
                    <div className="text-[9.5px] text-mist-500">{score ? `覆盖 ${Math.round(score.coverage * 100)}%` : ''}</div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleCompare(vehicle.id)}
                        aria-label={inCompare ? '移出对比' : '加入对比'}
                        title={inCompare ? '移出对比' : '加入对比'}
                        className={cn(
                          'inline-flex size-8 items-center justify-center rounded-lg border transition',
                          inCompare
                            ? 'border-accent/40 bg-accent/10 text-accent'
                            : 'border-transparent text-mist-400 hover:border-line-strong hover:text-mist-100',
                        )}
                      >
                        {inCompare ? <Check className="size-4" /> : <Columns2 className="size-4" />}
                      </button>
                      <IconButton label="编辑" icon={Pencil} onClick={() => onEdit(vehicle)} />
                      <button
                        type="button"
                        onClick={() => navigate(`/garage/${vehicle.id}`)}
                        aria-label="查看详情"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-mist-400 transition hover:bg-white/[0.04] hover:text-accent"
                      >
                        <ArrowUpRight className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
