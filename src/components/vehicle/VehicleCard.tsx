import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, Columns2, Pencil, Star } from 'lucide-react'
import type { FilterResult, ScoreResult, Vehicle, VehiclePriceInfo } from '@/types'
import { cn, formatWan, truncate } from '@/lib/format'
import { useApp } from '@/store/AppStore'
import { Badge, IconButton } from '@/components/ui/primitives'
import { ScoreRing, StatusBadge, VehicleCover } from '@/components/vehicle/VehicleVisuals'

export function VehicleCard({
  vehicle,
  priceInfo,
  score,
  filter,
  onEdit,
}: {
  vehicle: Vehicle
  priceInfo: VehiclePriceInfo
  score: ScoreResult
  filter: FilterResult
  onEdit: (vehicle: Vehicle) => void
}) {
  const { data, dispatch, toast } = useApp()
  const navigate = useNavigate()
  const inCompare = data.compareIds.includes(vehicle.id)
  const landing = priceInfo.breakdown.landing
  const noSubsidy = priceInfo.quote && !priceInfo.quote.includeTradeIn && (priceInfo.quote.tradeInSubsidy ?? 0) > 0

  const toggleCompare = () => {
    if (!inCompare && data.compareIds.length >= 6) {
      toast('对比清单最多 6 款，请先移除一款。', 'warning')
      return
    }
    dispatch({ type: 'TOGGLE_COMPARE', id: vehicle.id })
  }

  return (
    <article className="panel panel-hover group flex flex-col overflow-hidden">
      <Link to={`/garage/${vehicle.id}`} className="block">
        <VehicleCover vehicle={vehicle} className="h-[148px]" />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label flex items-center gap-1.5">
              {vehicle.brand}
              <span className="size-0.5 rounded-full bg-mist-500" />
              {vehicle.year}
            </div>
            <Link to={`/garage/${vehicle.id}`} className="group/title mt-1 block">
              <h3 className="truncate text-[17px] font-semibold tracking-tight text-mist-100 transition group-hover/title:text-accent">
                {vehicle.model}
              </h3>
            </Link>
            <p className="mt-0.5 truncate text-[11.5px] text-mist-500" title={vehicle.trim}>
              {vehicle.trim || '版本待补充'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={score.total} coverage={score.coverage} size={50} />
            <span className="text-[9px] uppercase tracking-wider text-mist-500">综合评分</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">
          <div>
            <div className="label mb-1">预计落地</div>
            <div className={cn('num text-[19px] font-semibold leading-none', landing ? 'text-accent' : 'text-mist-500')}>
              {landing ? formatWan(landing) : '待核实'}
            </div>
            <div className="mt-1 text-[10px] text-mist-500">
              {noSubsidy ? '未计置换补贴' : priceInfo.quote ? `指导 ${formatWan(priceInfo.quote.guidePrice)}` : '尚无报价'}
            </div>
          </div>
          <div>
            <div className="label mb-1">CLTC 续航</div>
            <div className="num text-[19px] font-semibold leading-none text-mist-100">
              {vehicle.specs.powertrain.cltcRange ?? '—'}
              <span className="ml-1 text-[10px] font-normal text-mist-500">km</span>
            </div>
            <div className="mt-1 text-[10px] text-mist-500">
              {vehicle.specs.powertrain.batteryKwh ? `${vehicle.specs.powertrain.batteryKwh} kWh` : '电池待核实'}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {vehicle.specs.adas.cityNoa === '标配' ? (
            <Badge tone="teal">城市 NOA 标配</Badge>
          ) : vehicle.specs.adas.cityNoa === '选装' ? (
            <Badge tone="amber">城市 NOA 选装</Badge>
          ) : (
            <Badge tone="neutral">智驾待核实</Badge>
          )}
          {(vehicle.specs.adas.lidar ?? 0) > 0 ? <Badge tone="violet">激光雷达</Badge> : null}
          {vehicle.specs.powertrain.highVoltage === '800V' ? <Badge tone="blue">800V</Badge> : null}
          {priceInfo.quote?.status === '待核实' ? <Badge tone="amber">价格待核实</Badge> : null}
          {filter.status === 'fail' ? <Badge tone="rose">不满足硬性条件</Badge> : null}
          {vehicle.keyCandidate ? (
            <Badge tone="lime">
              <Star className="size-2.5 fill-current" /> 重点
            </Badge>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-2 min-h-[32px] text-[11.5px] leading-4 text-mist-400">
          {vehicle.reason || '尚未填写关注原因。'}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 px-3 py-2.5">
        <StatusBadge status={vehicle.focusStatus} />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleCompare}
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
          <IconButton label="编辑车型" icon={Pencil} onClick={() => onEdit(vehicle)} />
          <button
            type="button"
            onClick={() => navigate(`/garage/${vehicle.id}`)}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-mist-400 transition hover:bg-white/[0.04] hover:text-accent"
          >
            详情 <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  )
}

export function VehicleMiniRow({ vehicle, onClick }: { vehicle: Vehicle; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line/70 bg-white/[0.012] p-2.5 text-left transition hover:border-accent/30 hover:bg-white/[0.025]"
    >
      <VehicleCover vehicle={vehicle} compact className="h-12 w-16 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-mist-200">
          {vehicle.brand} {vehicle.model}
        </div>
        <div className="truncate text-[10px] text-mist-500">{truncate(vehicle.trim, 24) || '版本待补充'}</div>
      </div>
      <StatusBadge status={vehicle.focusStatus} />
    </button>
  )
}
