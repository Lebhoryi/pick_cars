import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Check,
  ChevronDown,
  CircleSlash,
  Info,
  Minus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import type { ScoreDimId, Vehicle } from '@/types'
import { SCORE_DIMS } from '@/types'
import { useApp } from '@/store/AppStore'
import { cn, formatDate, formatWan } from '@/lib/format'
import {
  buildSnapshot,
  latestRankSnapshot,
  normalizeWeights,
  rankDelta,
} from '@/lib/score'
import { Badge, Button, EmptyState, InfoTip, PageHeader, ProgressBar, SectionTitle } from '@/components/ui/primitives'
import { MoneyInput, NumberInput, Segmented, SliderField, Toggle } from '@/components/ui/Field'
import { vehicleName } from '@/lib/analytics'

function scoreTone(value: number | null): string {
  if (value === null) return 'text-mist-600'
  if (value >= 8.5) return 'text-teal-300'
  if (value >= 7.5) return 'text-sky-300'
  if (value >= 6.5) return 'text-amber-300'
  return 'text-rose-300'
}

export function ScorePage() {
  const { data, scoresResult, dispatch, toast } = useApp()
  const { scores, filters, ranks, auto } = scoresResult
  const [expanded, setExpanded] = useState<string | null>(null)
  const [onlyPass, setOnlyPass] = useState(false)

  const weights = data.scoring.weights
  const normalized = normalizeWeights(weights)
  const rawTotal = SCORE_DIMS.reduce((sum, dim) => sum + (weights[dim.id] ?? 0), 0)
  const latestSnapshot =
    data.scoring.snapshots
      .filter((snapshot) => snapshot.mode === data.scoring.mode)
      .sort((a, b) => b.at.localeCompare(a.at))[0] ?? null

  const ordered = useMemo(
    () =>
      [...data.vehicles]
        .filter((vehicle) => scores[vehicle.id])
        .filter((vehicle) => !onlyPass || filters[vehicle.id].status !== 'fail')
        .sort((a, b) => {
          if (onlyPass) {
            const fa = filters[a.id].status === 'fail' ? 1 : 0
            const fb = filters[b.id].status === 'fail' ? 1 : 0
            if (fa !== fb) return fa - fb
          }
          return (scores[b.id]?.total ?? -1) - (scores[a.id]?.total ?? -1)
        }),
    [data.vehicles, scores, filters, onlyPass],
  )

  const passCount = data.vehicles.filter((v) => filters[v.id].status === 'pass').length
  const failCount = data.vehicles.filter((v) => filters[v.id].status === 'fail').length
  const unknownCount = data.vehicles.filter((v) => filters[v.id].status === 'unknown').length
  const topPass = ordered.find((vehicle) => filters[vehicle.id].status !== 'fail') ?? ordered[0] ?? null
  const avgCoverage =
    data.vehicles.length > 0
      ? data.vehicles.reduce((sum, v) => sum + (scores[v.id]?.coverage ?? 0), 0) / data.vehicles.length
      : 0

  const recordSnapshot = () => {
    const snapshot = buildSnapshot(data.vehicles, scores, filters, ranks, data.scoring.mode)
    dispatch({ type: 'ADD_SNAPSHOT', snapshot })
    toast('已记录当前排名快照，后续调整可与本次比较', 'success')
  }

  const updateWeight = (id: ScoreDimId, value: number) => {
    dispatch({ type: 'SET_SCORING', scoring: { ...data.scoring, weights: { ...weights, [id]: value } } })
  }

  const resetWeights = () => {
    const defaults = Object.fromEntries(SCORE_DIMS.map((dim) => [dim.id, dim.defaultWeight])) as Record<ScoreDimId, number>
    dispatch({ type: 'SET_SCORING', scoring: { ...data.scoring, weights: defaults } })
    toast('已恢复默认权重', 'info')
  }

  const setMode = (mode: 'manual' | 'auto') => {
    dispatch({ type: 'SET_SCORING', scoring: { ...data.scoring, mode } })
    toast(mode === 'manual' ? '已切换为手动评分' : '已切换为自动评分：缺失维度会标记为信息不足', 'info')
  }

  const updateFilters = (patch: Partial<typeof data.settings.hardFilters>) => {
    dispatch({
      type: 'SET_SETTINGS',
      settings: { ...data.settings, hardFilters: { ...data.settings.hardFilters, ...patch } },
    })
  }

  const setManualScore = (vehicle: Vehicle, dim: ScoreDimId, value: number | null) => {
    dispatch({
      type: 'UPSERT_VEHICLE',
      vehicle: { ...vehicle, manualScores: { ...vehicle.manualScores, [dim]: value } },
    })
  }

  if (data.vehicles.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={Trophy}
          title="还没有可评分的车型"
          description="先添加车型并录入关键参数，再回来设置权重与评分。"
          action={<Button onClick={() => dispatch({ type: 'RESET_SEED' })}>恢复示例数据</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="评分模型"
        subtitle="用可解释的权重把偏好变成排序，而不是让「配置更多」替你做决定。所有分数与权重都是个人偏好模型，不是客观车辆质量排名。"
        meta={
          <>
            <Badge tone={data.scoring.mode === 'manual' ? 'teal' : 'blue'} dot>
              {data.scoring.mode === 'manual' ? '手动评分' : '自动评分'}
            </Badge>
            <Badge tone="neutral">7 个维度 · 10 分制</Badge>
            <Badge tone="amber">个人模型</Badge>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={Camera} onClick={recordSnapshot}>
              记录排名快照
            </Button>
            <Button variant="ghost" icon={RotateCcw} onClick={resetWeights}>
              恢复默认权重
            </Button>
          </>
        }
      />

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3.5 py-2.5 text-[10.5px] leading-5 text-amber-100/75">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          评分只反映你当前写下的偏好与掌握的数据。缺失维度不会被按 0 分处理：它会被标记为「信息不足」，并在计算总分时按已有维度的权重重新归一化；数据覆盖度低于 80% 时请谨慎解读排名。初始手动分数是示例占位，请按试驾与实车体验校准，不要直接当作结论。
        </span>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* WEIGHTS + FILTERS */}
        <div className="grid min-w-0 gap-5 lg:grid-cols-2 2xl:grid-cols-1">
          <section className="panel p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-mist-100">权重设置</h2>
                <p className="mt-1 text-[10.5px] leading-4 text-mist-500">拖动滑块，系统自动归一化为 100%。原始权重之和 {rawTotal}。</p>
              </div>
              <Badge tone="teal">100%</Badge>
            </div>

            <div className="mt-4">
              <Segmented
                value={data.scoring.mode}
                onChange={setMode}
                options={[
                  { value: 'manual', label: '手动评分' },
                  { value: 'auto', label: '自动评分' },
                ]}
                className="w-full"
              />
              <p className="mt-2 text-[10px] leading-4 text-mist-500">
                {data.scoring.mode === 'manual'
                  ? '手动模式：直接填写 7 个维度的分数，适合已试驾、有主观判断的车型。'
                  : '自动模式：根据参数与来源自动折算分数，并在展开行展示评分依据。'}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {SCORE_DIMS.map((dim) => (
                <SliderField
                  key={dim.id}
                  label={`${dim.label}（${(normalized[dim.id] * 100).toFixed(0)}%）`}
                  value={weights[dim.id]}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(value) => updateWeight(dim.id, value)}
                  format={() => `${(normalized[dim.id] * 100).toFixed(0)}%`}
                  hint={dim.description}
                />
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 text-[10px] leading-4 text-mist-500">
              权重改变会立即作用于排序，但不会自动写入排名快照。点击「记录排名快照」后，后续变化才会显示为排名升降。
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="硬性筛选条件"
              description="不满足条件的车型会标记为「不符合」，但不删除；未知数据标记为「待核实」。"
              action={<Target className="size-4 text-mist-500" />}
            />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">最高落地预算</div>
                  <MoneyInput value={data.settings.hardFilters.maxLanding} onChange={(v) => updateFilters({ maxLanding: v })} />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] text-mist-300">最低 CLTC 续航</div>
                  <NumberInput
                    value={data.settings.hardFilters.minRange}
                    onChange={(v) => updateFilters({ minRange: v })}
                    unit="km"
                    min={0}
                    step={10}
                  />
                </div>
              </div>
              <Toggle
                checked={data.settings.hardFilters.requireCityNoa}
                onChange={(checked) => updateFilters({ requireCityNoa: checked })}
                label="必须具备城市 NOA"
                description="要求「标配」；选装不算满足"
              />
              <Toggle
                checked={data.settings.hardFilters.requireLidar}
                onChange={(checked) => updateFilters({ requireLidar: checked })}
                label="必须配备激光雷达"
                description="按已录入的硬件数量判断"
              />
              <Toggle
                checked={data.settings.hardFilters.keyOnly}
                onChange={(checked) => updateFilters({ keyOnly: checked })}
                label="只在重点候选中排序"
                description="排除观察中/暂时淘汰车型"
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['满足', passCount, 'text-positive'],
                ['不符合', failCount, 'text-danger'],
                ['待核实', unknownCount, 'text-amber-300'],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2">
                  <div className="text-[9px] text-mist-500">{label}</div>
                  <div className={cn('num mt-0.5 text-lg font-semibold', String(color))}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-4 sm:p-5 lg:col-span-2 2xl:col-span-1">
            <SectionTitle title="当前摘要" />
            <div className="mt-4 space-y-3 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-mist-500">综合第一</span>
                <span className="text-right text-mist-200">
                  {ordered[0] ? `${vehicleName(ordered[0])} · ${scores[ordered[0].id]?.total?.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist-500">符合硬性条件第一</span>
                <span className="text-right text-mist-200">
                  {topPass ? `${vehicleName(topPass)} · ${scores[topPass.id]?.total?.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist-500">平均数据覆盖度</span>
                <span className="num text-mist-200">{(avgCoverage * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist-500">最新快照</span>
                <span className="text-right text-mist-400">
                  {latestSnapshot
                    ? `${formatDate(latestSnapshot.at.slice(0, 10))} · ${
                        vehicleName(data.vehicles.find((v) => v.id === latestSnapshot.entries[0]?.vehicleId) ?? data.vehicles[0])
                      }`
                    : '尚未记录'}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={avgCoverage} tone={avgCoverage >= 0.8 ? 'teal' : 'amber'} height="h-1.5" />
            </div>
          </section>
        </div>

        {/* RANKING */}
        <div className="min-w-0 space-y-5">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-mist-100">评分排名</h2>
                <p className="mt-0.5 text-[10px] text-mist-500">
                  点击行末箭头查看自动评分依据；排名升降对比最近快照。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyPass((v) => !v)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10.5px] transition',
                    onlyPass
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-line-strong text-mist-400 hover:text-mist-200',
                  )}
                >
                  <SlidersHorizontal className="size-3.5" /> 只看符合条件
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table min-w-[1080px]">
                <thead>
                  <tr>
                    <th className="table-head w-10 text-center">#</th>
                    <th className="table-head text-left">车型</th>
                    <th className="table-head text-right">综合</th>
                    <th className="table-head text-right">覆盖</th>
                    {SCORE_DIMS.map((dim) => (
                      <th key={dim.id} className="table-head text-center" title={dim.label}>
                        {dim.short}
                      </th>
                    ))}
                    <th className="table-head text-center">硬性条件</th>
                    <th className="table-head text-center">较上次</th>
                    <th className="table-head w-8" />
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((vehicle) => {
                    const score = scores[vehicle.id]
                    const delta = rankDelta(data.scoring, vehicle.id, ranks[vehicle.id], data.scoring.mode)
                    const filter = filters[vehicle.id]
                    const isOpen = expanded === vehicle.id
                    return (
                      <Fragment key={vehicle.id}>
                        <tr className={cn(isOpen && 'bg-white/[0.02]')}>
                          <td className="table-cell text-center">
                            <span className={cn('num inline-flex size-6 items-center justify-center rounded-md text-[11px]', (ranks[vehicle.id] ?? 99) <= 3 ? 'bg-accent/10 font-semibold text-accent' : 'text-mist-500')}>
                              {ranks[vehicle.id] ?? '—'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <Link to={`/garage/${vehicle.id}`} className="text-[12px] font-medium text-mist-100 transition hover:text-accent">
                                {vehicle.brand} {vehicle.model}
                              </Link>
                              {vehicle.keyCandidate ? <Badge tone="lime">重点</Badge> : null}
                            </div>
                            <div className="mt-0.5 truncate text-[9.5px] text-mist-500">{vehicle.trim || '版本待补充'}</div>
                          </td>
                          <td className="table-cell text-right">
                            <span className={cn('num text-[15px] font-semibold', scoreTone(score.total))}>
                              {score.total !== null ? score.total.toFixed(2) : '—'}
                            </span>
                          </td>
                          <td className="table-cell text-right">
                            <span className={cn('num text-[10px]', score.coverage >= 0.8 ? 'text-mist-400' : 'text-amber-300')}>
                              {Math.round(score.coverage * 100)}%
                            </span>
                          </td>
                          {SCORE_DIMS.map((dim) => {
                            const value = score.dims[dim.id].score
                            return (
                              <td key={dim.id} className="table-cell text-center">
                                <span className={cn('num text-[10.5px]', value === null ? 'text-mist-600' : scoreTone(value))}>
                                  {value !== null ? value.toFixed(1) : '—'}
                                </span>
                              </td>
                            )
                          })}
                          <td className="table-cell text-center">
                            {filter.status === 'pass' ? (
                              <Badge tone="teal">满足</Badge>
                            ) : filter.status === 'fail' ? (
                              <Badge tone="rose">不符合</Badge>
                            ) : (
                              <Badge tone="amber">待核实</Badge>
                            )}
                          </td>
                          <td className="table-cell text-center">
                            {delta === null ? (
                              <span className="text-[10px] text-mist-600">—</span>
                            ) : delta === 0 ? (
                              <span className="text-[10px] text-mist-500">持平</span>
                            ) : delta > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-positive">
                                <ArrowUpRight className="size-3" /> {delta}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-danger">
                                <ArrowDownRight className="size-3" /> {Math.abs(delta)}
                              </span>
                            )}
                          </td>
                          <td className="table-cell text-right">
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : vehicle.id)}
                              aria-label="查看评分依据"
                              className="inline-flex size-7 items-center justify-center rounded-lg text-mist-500 transition hover:bg-white/5 hover:text-mist-100"
                            >
                              <ChevronDown className={cn('size-4 transition', isOpen && 'rotate-180')} />
                            </button>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr key={`${vehicle.id}-detail`}>
                            <td colSpan={14} className="border-b border-line/50 bg-ink-900/50 px-4 py-4 sm:px-5">
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {SCORE_DIMS.map((dim) => {
                                  const item = score.dims[dim.id]
                                  const autoDim = auto[vehicle.id]?.[dim.id]
                                  return (
                                    <div key={dim.id} className="rounded-xl border border-line/70 bg-ink-850 p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-medium text-mist-200">{dim.label}</span>
                                        <span className={cn('num text-[13px] font-semibold', scoreTone(item.score))}>
                                          {item.score !== null ? item.score.toFixed(1) : '信息不足'}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex items-center justify-between text-[9px] text-mist-500">
                                        <span>有效权重 {(item.effectiveWeight * 100).toFixed(0)}%</span>
                                        <span>{item.source === 'manual' ? '手动' : item.source === 'auto' ? '自动' : '缺失'}</span>
                                      </div>
                                      {item.basis ? <p className="mt-2 text-[9.5px] leading-4 text-mist-500">{item.basis}</p> : null}
                                      {data.scoring.mode === 'auto' && autoDim ? (
                                        <div className="mt-2 space-y-1">
                                          {autoDim.criteria.slice(0, 6).map((criterion) => (
                                            <div key={criterion.label} className="flex items-start gap-1.5 text-[9px] leading-4">
                                              {!criterion.available ? (
                                                <Minus className="mt-0.5 size-2.5 shrink-0 text-mist-600" />
                                              ) : criterion.met ? (
                                                <Check className="mt-0.5 size-2.5 shrink-0 text-positive" />
                                              ) : (
                                                <X className="mt-0.5 size-2.5 shrink-0 text-mist-600" />
                                              )}
                                              <span className={criterion.available ? 'text-mist-400' : 'text-mist-600'}>
                                                <span className="text-mist-500">{criterion.label}：</span>
                                                {criterion.detail}
                                              </span>
                                            </div>
                                          ))}
                                          {autoDim.missing.length > 0 ? (
                                            <div className="text-[9px] text-amber-200/70">缺：{autoDim.missing.join('、')}</div>
                                          ) : null}
                                        </div>
                                      ) : null}
                                      {item.missing && item.missing.length > 0 && data.scoring.mode === 'manual' ? (
                                        <div className="mt-1 text-[9px] text-amber-200/70">缺：{item.missing.join('、')}</div>
                                      ) : null}
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-mist-500">
                                <span>
                                  依据来自车型参数与来源标注；缺失数据不按 0 分计。自动评分仅为辅助，不替代试驾。
                                </span>
                                <Link to={`/garage/${vehicle.id}?tab=sources`} className="inline-flex items-center gap-1 text-mist-400 hover:text-accent">
                                  查看字段来源 <ArrowUpRight className="size-3" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                  {ordered.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-12 text-center text-xs text-mist-500">
                        没有符合当前筛选的车型。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          {data.scoring.mode === 'manual' ? (
            <section className="panel p-4 sm:p-5">
              <SectionTitle
                title="手动评分录入"
                description="0–10 分，可留空表示信息不足。留空的维度不会按 0 分计算，而是从总分权重中剔除。"
                action={<Badge tone="amber">主观评分</Badge>}
              />
              <div className="mt-4 overflow-x-auto">
                <table className="data-table min-w-[880px]">
                  <thead>
                    <tr>
                      <th className="table-head text-left">车型</th>
                      {SCORE_DIMS.map((dim) => (
                        <th key={dim.id} className="table-head text-center" title={dim.label}>
                          {dim.short}
                        </th>
                      ))}
                      <th className="table-head text-right">加权</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td className="table-cell">
                          <Link to={`/garage/${vehicle.id}`} className="text-[11.5px] text-mist-200 hover:text-accent">
                            {vehicle.brand} {vehicle.model}
                          </Link>
                          <div className="text-[9px] text-mist-500">{vehicle.trim}</div>
                        </td>
                        {SCORE_DIMS.map((dim) => (
                          <td key={dim.id} className="table-cell">
                            <NumberInput
                              value={vehicle.manualScores[dim.id]}
                              onChange={(value) => setManualScore(vehicle, dim.id, value)}
                              min={0}
                              max={10}
                              step={0.1}
                              placeholder="—"
                              className="h-8 px-2 py-0 text-center text-[11px]"
                            />
                          </td>
                        ))}
                        <td className="table-cell text-right">
                          <span className={cn('num text-[12px] font-semibold', scoreTone(scores[vehicle.id]?.total))}>
                            {scores[vehicle.id]?.total?.toFixed(2) ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-mist-500">
                评分会自动保存。建议每次试驾后只调整有把握的维度，并在车型笔记中记录理由，避免分数变成拍脑袋。
              </p>
            </section>
          ) : (
            <section className="panel p-4 sm:p-5">
              <SectionTitle
                title="自动评分说明"
                description="自动评分按可核对的参数与门槛折算，缺失项不计入分母。"
                action={<Sparkles className="size-4 text-accent" />}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SCORE_DIMS.map((dim) => {
                  const sample = data.vehicles.find((v) => auto[v.id]?.[dim.id]?.score != null)
                  const autoDim = sample ? auto[sample.id]?.[dim.id] : null
                  return (
                    <div key={dim.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-mist-200">{dim.label}</span>
                        <span className="text-[9px] text-mist-500">权重 {(normalized[dim.id] * 100).toFixed(0)}%</span>
                      </div>
                      <p className="mt-1 text-[9.5px] leading-4 text-mist-500">{dim.description}</p>
                      {autoDim ? (
                        <p className="mt-1.5 text-[9px] leading-4 text-mist-400">
                          {autoDim.basis} 覆盖 {Math.round(autoDim.coverage * 100)}%
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* SNAPSHOTS */}
          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="排名快照与变化"
              description={latestSnapshot ? `最近快照：${new Date(latestSnapshot.at).toLocaleString('zh-CN')} · ${latestSnapshot.mode === 'manual' ? '手动' : '自动'}模式` : '尚未记录快照'}
              action={
                <Button size="sm" variant="secondary" icon={Camera} onClick={recordSnapshot}>
                  记录当前排名
                </Button>
              }
            />
            <div className="mt-4 space-y-2.5">
              {data.scoring.snapshots
                .slice()
                .reverse()
                .slice(0, 5)
                .map((snapshot) => (
                  <div key={snapshot.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <span className="text-mist-400">
                        {new Date(snapshot.at).toLocaleString('zh-CN')} · {snapshot.mode === 'manual' ? '手动' : '自动'}
                      </span>
                      <span className="text-mist-500">{snapshot.entries.length} 款车型</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {snapshot.entries.slice(0, 3).map((entry) => {
                        const vehicle = data.vehicles.find((v) => v.id === entry.vehicleId)
                        if (!vehicle) return null
                        return (
                          <span key={entry.vehicleId} className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-ink-900/50 px-2 py-0.5 text-[9.5px] text-mist-400">
                            <span className="num text-accent">#{entry.rank}</span>
                            {vehicleName(vehicle)}
                            <span className="num text-mist-500">{entry.score?.toFixed(2) ?? '—'}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              {data.scoring.snapshots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-[11px] text-mist-500">
                  记录一次快照后，调整权重即可在排名表看到升降。
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-4 text-mist-500">
              <CircleSlash className="mt-0.5 size-3 shrink-0" />
              快照只保存排名、分数与覆盖度，不保存当时的权重；如需长期对比，建议在数据管理中导出 JSON 备份。
            </div>
          </section>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-[10px] text-mist-500">
        <InfoTip text="评分维度的定义、权重与手动分数共同构成个人偏好模型。它不能替代官方参数、第三方实测或试驾，也不构成任何购车建议。">
          <button type="button" className="inline-flex items-center gap-1 hover:text-accent">
            <Info className="size-3" /> 评分模型边界说明
          </button>
        </InfoTip>
        <span>·</span>
        <Link to="/data" className="hover:text-accent">
          导出备份
        </Link>
        <span>·</span>
        <span>预算上限 {formatWan(data.settings.hardFilters.maxLanding)}</span>
      </div>
    </div>
  )
}
