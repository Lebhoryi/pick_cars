import type {
  AppSettings,
  FilterResult,
  PriceQuote,
  ScoreDimId,
  ScoreResult,
  ScoringState,
  Vehicle,
  VehiclePriceInfo,
} from '@/types'
import { SCORE_DIMS, SCORE_DIM_IDS } from '@/types'
import { clamp, isNum } from '@/lib/format'
import { buildPriceMap } from '@/lib/price'

export interface AutoCriterion {
  label: string
  met: boolean
  available: boolean
  detail: string
}

export interface AutoDimResult {
  score: number | null
  coverage: number
  basis: string
  criteria: AutoCriterion[]
  missing: string[]
}

export type AutoScoreMap = Record<string, Record<ScoreDimId, AutoDimResult>>

export function normalizeWeights(weights: Record<ScoreDimId, number>): Record<ScoreDimId, number> {
  const total = SCORE_DIM_IDS.reduce((sum, id) => sum + Math.max(0, Number(weights[id]) || 0), 0)
  const out = {} as Record<ScoreDimId, number>
  if (total <= 0) {
    for (const id of SCORE_DIM_IDS) out[id] = 1 / SCORE_DIM_IDS.length
    return out
  }
  for (const id of SCORE_DIM_IDS) out[id] = Math.max(0, Number(weights[id]) || 0) / total
  return out
}

function criteriaScore(criteria: AutoCriterion[], label: string): AutoDimResult {
  const totalWeight = criteria.length
  const available = criteria.filter((c) => c.available)
  const met = available.filter((c) => c.met)
  const coverage = available.length / totalWeight
  const missing = criteria.filter((c) => !c.available).map((c) => c.label)
  if (available.length === 0 || coverage < 0.25) {
    return {
      score: null,
      coverage,
      basis: `${label}：关键数据不足，无法自动评分。`,
      criteria,
      missing,
    }
  }
  const score = Number(((met.length / available.length) * 10).toFixed(2))
  return {
    score,
    coverage,
    basis: `${label}：已评估 ${available.length}/${criteria.length} 项，满足 ${met.length} 项，折算 ${score.toFixed(1)} 分。`,
    criteria,
    missing,
  }
}

function autoPrice(
  vehicle: Vehicle,
  info: VehiclePriceInfo,
  all: Vehicle[],
  settings: AppSettings,
  priceMap: Record<string, VehiclePriceInfo>,
): AutoDimResult {
  const landing = info.breakdown.landing
  if (landing === null || info.quote?.status === '待核实') {
    return {
      score: null,
      coverage: 0,
      basis: landing === null ? '价格：缺少可计算的落地价，无法自动评分。' : '价格：报价仍为待核实状态，自动评分暂不采用。',
      criteria: [],
      missing: [landing === null ? '落地价' : '价格待核实'],
    }
  }

  const span = Math.max(1, settings.budgetMax - settings.budgetMin)
  const affordability =
    landing <= settings.budgetMin ? 10 : landing >= settings.budgetMax ? 5 : 10 - ((landing - settings.budgetMin) / span) * 5
  const criteria: AutoCriterion[] = [
    {
      label: '预算适配',
      available: true,
      met: affordability >= 7,
      detail: `预计落地 ${(landing / 10000).toFixed(2)} 万，预算 ${(settings.budgetMin / 10000).toFixed(0)}–${(settings.budgetMax / 10000).toFixed(0)} 万 → ${affordability.toFixed(1)} 分`,
    },
  ]

  const range = vehicle.specs.powertrain.cltcRange
  const peers = all
    .map((v) => {
      const vInfo = priceMap[v.id]
      if (vInfo?.quote?.status === '待核实') return null
      const price = vInfo?.breakdown.landing
      const r = v.specs.powertrain.cltcRange
      return price && r ? r / (price / 10000) : null
    })
    .filter((v): v is number => isNum(v))
  let valueDetail = 'CLTC 续航缺失，未计性价比部分'
  let valueScore: number | null = null
  if (range && peers.length >= 2) {
    const own = range / (landing / 10000)
    const min = Math.min(...peers)
    const max = Math.max(...peers)
    valueScore = max === min ? 7 : clamp(((own - min) / (max - min)) * 10, 0, 10)
    valueDetail = `每万元续航 ${own.toFixed(1)} km，组内区间 ${min.toFixed(1)}–${max.toFixed(1)} → ${valueScore.toFixed(1)} 分`
  }
  criteria.push({
    label: '续航/价格比',
    available: valueScore !== null,
    met: (valueScore ?? 0) >= 5,
    detail: valueDetail,
  })

  const score = Number(
    (valueScore === null ? affordability : affordability * 0.7 + valueScore * 0.3).toFixed(2),
  )
  return {
    score,
    coverage: valueScore === null ? 0.7 : 1,
    basis: `价格：落地 ${(landing / 10000).toFixed(2)} 万，预算适配度 ${affordability.toFixed(1)}/10；${valueDetail}。`,
    criteria,
    missing: criteria.filter((c) => !c.available).map((c) => c.label),
  }
}

function parseNumber(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function autoAdas(vehicle: Vehicle): AutoDimResult {
  const a = vehicle.specs.adas
  const criteria: AutoCriterion[] = [
    {
      label: '激光雷达',
      available: a.lidar !== null,
      met: (a.lidar ?? 0) > 0,
      detail: a.lidar === null ? '未填写' : `${a.lidar} 颗${a.lidarSpec ? `（${a.lidarSpec}）` : ''}`,
    },
    {
      label: '城市 NOA 可用',
      available: a.cityNoa !== '' && a.cityNoa !== '待核实',
      met: a.cityNoa === '标配' || a.cityNoa === '选装',
      detail: a.cityNoa || '未填写',
    },
    {
      label: '城市 NOA 标配',
      available: a.cityNoa !== '' && a.cityNoa !== '待核实',
      met: a.cityNoa === '标配',
      detail: a.cityNoa || '未填写',
    },
    {
      label: '高速 NOA',
      available: a.highSpeedNoa !== '' && a.highSpeedNoa !== '待核实',
      met: a.highSpeedNoa === '标配' || a.highSpeedNoa === '选装',
      detail: a.highSpeedNoa || '未填写',
    },
    {
      label: '算力 ≥100TOPS',
      available: a.tops !== null,
      met: (a.tops ?? 0) >= 100,
      detail: a.tops === null ? '未填写' : `${a.tops} TOPS`,
    },
    {
      label: '算力 ≥200TOPS',
      available: a.tops !== null,
      met: (a.tops ?? 0) >= 200,
      detail: a.tops === null ? '未填写' : `${a.tops} TOPS`,
    },
    {
      label: '算力 ≥500TOPS',
      available: a.tops !== null,
      met: (a.tops ?? 0) >= 500,
      detail: a.tops === null ? '未填写' : `${a.tops} TOPS`,
    },
    {
      label: '自动泊车',
      available: a.autoPark !== '' && a.autoPark !== '待核实',
      met: a.autoPark === '标配' || a.autoPark === '选装',
      detail: a.autoPark || '未填写',
    },
    {
      label: '硬件标配',
      available: a.hardware !== '' && a.hardware !== '待核实',
      met: a.hardware.startsWith('标配'),
      detail: a.hardware || '未填写',
    },
    {
      label: '软件免费/已含',
      available: a.softwareFee !== '' && a.softwareFee !== '待核实',
      met: /免费|标配|已含|0\s*元/.test(a.softwareFee),
      detail: a.softwareFee || '未填写',
    },
  ]
  return criteriaScore(criteria, '智驾')
}

function autoChassis(vehicle: Vehicle): AutoDimResult {
  const c = vehicle.specs.chassis
  const text = (value: string): boolean => Boolean(value && value !== '待核实')
  const criteria: AutoCriterion[] = [
    { label: '前双叉臂', available: text(c.frontSusp), met: /双叉臂/.test(c.frontSusp), detail: c.frontSusp || '未填写' },
    { label: '后多连杆', available: text(c.rearSusp), met: /多连杆|五连杆/.test(c.rearSusp), detail: c.rearSusp || '未填写' },
    { label: '可变阻尼', available: text(c.damping), met: /CDC|FSD|可变阻尼|电磁/.test(c.damping), detail: c.damping || '未填写' },
    { label: '空气悬架', available: c.airSusp !== null, met: c.airSusp === true, detail: c.airSusp === null ? '未填写' : c.airSusp ? '有' : '无' },
    { label: '路面预瞄', available: c.roadPreview !== null, met: c.roadPreview === true, detail: c.roadPreview === null ? '未填写' : c.roadPreview ? '有' : '无' },
    { label: '铝合金悬架', available: text(c.suspMaterial), met: /铝/.test(c.suspMaterial), detail: c.suspMaterial || '未填写' },
    {
      label: '扭转刚度 ≥40000',
      available: c.rigidity !== null,
      met: (c.rigidity ?? 0) >= 40000,
      detail: c.rigidity === null ? '未填写' : `${c.rigidity.toLocaleString('zh-CN')} N·m/deg`,
    },
    {
      label: '转弯半径 ≤5.8m',
      available: c.turningRadius !== null,
      met: (c.turningRadius ?? 99) <= 5.8,
      detail: c.turningRadius === null ? '未填写' : `${c.turningRadius} m`,
    },
  ]
  return criteriaScore(criteria, '底盘')
}

function autoRange(vehicle: Vehicle): AutoDimResult {
  const p = vehicle.specs.powertrain
  if (p.cltcRange === null) {
    return {
      score: null,
      coverage: 0,
      basis: '续航：缺少 CLTC 续航，无法自动评分。',
      criteria: [],
      missing: ['CLTC 续航'],
    }
  }
  const rangeScore = clamp(6 + ((p.cltcRange - 500) / 300) * 4, 3, 10)
  const criteria: AutoCriterion[] = [
    {
      label: 'CLTC 续航',
      available: true,
      met: p.cltcRange >= 650,
      detail: `${p.cltcRange} km → 基础分 ${rangeScore.toFixed(1)}`,
    },
  ]
  let score = rangeScore
  if (p.consumption !== null) {
    const delta = clamp((15 - p.consumption) * 0.15, -0.8, 0.8)
    score += delta
    criteria.push({
      label: '百公里电耗',
      available: true,
      met: p.consumption <= 14,
      detail: `${p.consumption} kWh/100km → ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`,
    })
  } else {
    criteria.push({ label: '百公里电耗', available: false, met: false, detail: '未填写' })
  }
  if (p.fastChargeTimeMin !== null) {
    const delta = p.fastChargeTimeMin <= 12 ? 1.2 : p.fastChargeTimeMin <= 18 ? 0.8 : p.fastChargeTimeMin <= 25 ? 0.4 : 0
    score += delta
    criteria.push({
      label: '快充速度',
      available: true,
      met: delta >= 0.8,
      detail: `${p.fastChargeTimeMin} min ${p.fastChargeSoc || ''} → +${delta.toFixed(1)}`,
    })
  } else {
    criteria.push({ label: '快充速度', available: false, met: false, detail: '未填写' })
  }
  const highVoltage = /800V/.test(p.highVoltage)
  if (p.highVoltage && p.highVoltage !== '待核实') {
    criteria.push({ label: '800V 平台', available: true, met: highVoltage, detail: p.highVoltage })
    if (highVoltage) score += 0.5
  } else {
    criteria.push({ label: '800V 平台', available: false, met: false, detail: '未填写' })
  }
  score = Number(clamp(score, 0, 10).toFixed(2))
  const available = criteria.filter((c) => c.available).length
  return {
    score,
    coverage: available / criteria.length,
    basis: `续航：CLTC ${p.cltcRange}km 基础分 ${rangeScore.toFixed(1)}，电耗/快充/平台修正后 ${score.toFixed(1)} 分。`,
    criteria,
    missing: criteria.filter((c) => !c.available).map((c) => c.label),
  }
}

function autoSpace(vehicle: Vehicle): AutoDimResult {
  const b = vehicle.specs.body
  const parts: Array<{ label: string; score: number; weight: number; detail: string }> = []
  if (b.wheelbase !== null) parts.push({ label: '轴距', weight: 0.35, score: clamp(4 + ((b.wheelbase - 2700) / 400) * 6, 2, 10), detail: `${b.wheelbase} mm` })
  if (b.rearLegroom !== null) parts.push({ label: '后排腿部', weight: 0.25, score: clamp(4 + ((b.rearLegroom - 850) / 250) * 6, 2, 10), detail: `${b.rearLegroom} mm` })
  if (b.trunkL !== null) parts.push({ label: '后备厢', weight: 0.2, score: clamp(3 + ((b.trunkL - 400) / 300) * 6, 2, 10), detail: `${b.trunkL} L` })
  if (b.frunkL !== null) parts.push({ label: '前备厢', weight: 0.1, score: clamp(4 + (b.frunkL / 200) * 5, 2, 10), detail: `${b.frunkL} L` })
  if (b.width !== null) parts.push({ label: '车宽', weight: 0.1, score: clamp(5 + ((b.width - 1850) / 150) * 4, 2, 10), detail: `${b.width} mm` })

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  if (parts.length === 0 || totalWeight < 0.3) {
    return {
      score: null,
      coverage: totalWeight,
      basis: '空间：尺寸与储物数据不足，无法自动评分。',
      criteria: [],
      missing: ['轴距/后排空间/后备厢'],
    }
  }
  const weighted = parts.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight
  const score = Number(weighted.toFixed(2))
  const criteria: AutoCriterion[] = parts.map((p) => ({
    label: p.label,
    available: true,
    met: p.score >= 6,
    detail: `${p.detail} → ${p.score.toFixed(1)} 分`,
  }))
  return {
    score,
    coverage: totalWeight,
    basis: `空间：按轴距/后排/后备厢/前备厢/车宽加权，已评估 ${parts.length} 项，折算 ${score.toFixed(1)} 分。`,
    criteria,
    missing: ['轴距', '后排腿部', '后备厢', '前备厢', '车宽'].filter((label) => !parts.some((p) => p.label === label)),
  }
}

function autoCockpit(vehicle: Vehicle): AutoDimResult {
  const c = vehicle.specs.comfort
  const criteria: AutoCriterion[] = []
  const screen = parseNumber(c.screen)
  criteria.push({
    label: '中控屏尺寸',
    available: screen !== null,
    met: screen !== null && screen >= 15,
    detail: screen === null ? '未填写' : `${screen} 英寸`,
  })
  const chipText = c.chip
  const chipScore = /8295|龍鹰|龙鹰/.test(chipText) ? 10 : /8155|麒麟/.test(chipText) ? 7.5 : chipText ? 6 : null
  criteria.push({
    label: '车机芯片',
    available: chipScore !== null,
    met: (chipScore ?? 0) >= 7.5,
    detail: chipText || '未填写',
  })
  criteria.push({
    label: '扬声器 ≥12',
    available: c.speakers !== null,
    met: (c.speakers ?? 0) >= 12,
    detail: c.speakers === null ? '未填写' : `${c.speakers} 个${c.audioBrand ? `（${c.audioBrand}）` : ''}`,
  })
  const seatFeatures = [c.seatHeat, c.seatVent, c.seatMassage]
  const seatKnown = seatFeatures.filter((v) => v !== null).length
  const seatCount = seatFeatures.filter((v) => v === true).length
  criteria.push({
    label: '座椅加热/通风/按摩',
    available: seatKnown > 0,
    met: seatKnown > 0 && seatCount >= 2,
    detail: seatKnown === 0 ? '未填写' : `${seatCount}/${seatKnown} 项`,
  })
  criteria.push({
    label: 'HUD',
    available: c.hud !== '' && c.hud !== '待核实',
    met: c.hud !== '' && c.hud !== '待核实' && !c.hud.startsWith('无'),
    detail: c.hud || '未填写',
  })
  criteria.push({
    label: '手机互联',
    available: c.phoneLink !== '' && c.phoneLink !== '待核实',
    met: c.phoneLink !== '' && c.phoneLink !== '待核实' && c.phoneLink !== '无',
    detail: c.phoneLink || '未填写',
  })
  criteria.push({
    label: 'OTA',
    available: c.ota !== '' && c.ota !== '待核实',
    met: c.ota !== '' && c.ota !== '待核实' && c.ota !== '不支持',
    detail: c.ota || '未填写',
  })
  return criteriaScore(criteria, '座舱')
}

function autoBrand(vehicle: Vehicle): AutoDimResult {
  const b = vehicle.specs.basic
  const criteria: AutoCriterion[] = [
    {
      label: '三电质保',
      available: b.warranty !== '' && b.warranty !== '待核实',
      met: /终身/.test(b.warranty),
      detail: b.warranty || '未填写',
    },
    {
      label: '整车质保 ≥5 年',
      available: b.warranty !== '' && b.warranty !== '待核实',
      met: /(6|5)\s*年|六年|五年/.test(b.warranty),
      detail: b.warranty || '未填写',
    },
    {
      label: '残值率 ≥45%',
      available: b.residualRate !== null,
      met: (b.residualRate ?? 0) >= 45,
      detail: b.residualRate === null ? '未填写（个人估算项）' : `${b.residualRate}%`,
    },
    {
      label: '在售状态',
      available: b.saleStatus !== '' && b.saleStatus !== '待核实',
      met: b.saleStatus === '在售',
      detail: b.saleStatus || '未填写',
    },
    {
      label: '服务网络描述',
      available: b.serviceNetwork !== '' && b.serviceNetwork !== '待核实',
      met: /覆盖|门店|网络|授权/.test(b.serviceNetwork),
      detail: b.serviceNetwork || '未填写',
    },
  ]
  return criteriaScore(criteria, '品牌/售后')
}

export function computeAutoScores(
  vehicles: Vehicle[],
  quotes: PriceQuote[],
  settings: AppSettings,
): AutoScoreMap {
  const priceMap = buildPriceMap(vehicles, quotes, settings)
  const map: AutoScoreMap = {}
  for (const vehicle of vehicles) {
    const info = priceMap[vehicle.id]
    map[vehicle.id] = {
      price: autoPrice(vehicle, info, vehicles, settings, priceMap),
      adas: autoAdas(vehicle),
      chassis: autoChassis(vehicle),
      range: autoRange(vehicle),
      space: autoSpace(vehicle),
      cockpit: autoCockpit(vehicle),
      brand: autoBrand(vehicle),
    }
  }
  return map
}

export function evaluateFilters(
  vehicle: Vehicle,
  priceInfo: VehiclePriceInfo,
  settings: AppSettings,
): FilterResult {
  const filters = settings.hardFilters
  const reasons: string[] = []
  let unknown = false
  if (filters.keyOnly && !vehicle.keyCandidate) reasons.push('不是重点候选')
  if (filters.maxLanding !== null) {
    if (priceInfo.breakdown.landing === null) {
      unknown = true
      reasons.push('落地价待核实')
    } else if (priceInfo.breakdown.landing > filters.maxLanding) {
      reasons.push(`落地价超过 ${(filters.maxLanding / 10000).toFixed(1)} 万`)
    }
  }
  if (filters.minRange !== null) {
    const range = vehicle.specs.powertrain.cltcRange
    if (range === null) {
      unknown = true
      reasons.push('续航待核实')
    } else if (range < filters.minRange) {
      reasons.push(`CLTC 低于 ${filters.minRange}km`)
    }
  }
  if (filters.requireCityNoa) {
    const city = vehicle.specs.adas.cityNoa
    if (!city || city === '待核实') {
      unknown = true
      reasons.push('城市 NOA 待核实')
    } else if (city !== '标配') {
      reasons.push('城市 NOA 非标配')
    }
  }
  if (filters.requireLidar) {
    const lidar = vehicle.specs.adas.lidar
    if (lidar === null) {
      unknown = true
      reasons.push('激光雷达待核实')
    } else if (lidar <= 0) {
      reasons.push('无激光雷达')
    }
  }
  const status: FilterResult['status'] = reasons.some((r) => !r.includes('待核实')) ? 'fail' : unknown ? 'unknown' : 'pass'
  return { status, reasons }
}

export function computeScore(
  vehicle: Vehicle,
  mode: 'manual' | 'auto',
  weights: Record<ScoreDimId, number>,
  auto?: Record<ScoreDimId, AutoDimResult>,
): ScoreResult {
  const normalized = normalizeWeights(weights)
  const dims = {} as ScoreResult['dims']
  let weightedSum = 0
  let availableWeight = 0

  for (const dim of SCORE_DIMS) {
    const autoDim = auto?.[dim.id]
    const manualScore = vehicle.manualScores[dim.id]
    const score = mode === 'manual' ? manualScore : (autoDim?.score ?? null)
    const available = isNum(score)
    if (available) {
      weightedSum += score * normalized[dim.id]
      availableWeight += normalized[dim.id]
    }
    dims[dim.id] = {
      score: available ? score : null,
      weight: normalized[dim.id],
      effectiveWeight: available ? normalized[dim.id] / Math.max(availableWeight, 1e-9) : 0,
      source: available ? mode : 'none',
      basis: mode === 'auto' ? autoDim?.basis : undefined,
      criteria: mode === 'auto' ? autoDim?.criteria : undefined,
      missing:
        mode === 'auto'
          ? (autoDim?.missing ?? [])
          : !available
            ? ['尚未手动评分']
            : [],
    }
  }

  const total = availableWeight > 0 ? Number((weightedSum / availableWeight).toFixed(2)) : null
  for (const dim of SCORE_DIMS) {
    dims[dim.id].effectiveWeight = availableWeight > 0 && dims[dim.id].score !== null ? normalized[dim.id] / availableWeight : 0
  }

  return {
    total,
    coverage: Number(availableWeight.toFixed(4)),
    dims,
  }
}

export function computeAllScores(
  vehicles: Vehicle[],
  quotes: PriceQuote[],
  settings: AppSettings,
  scoring: ScoringState,
): {
  scores: Record<string, ScoreResult>
  filters: Record<string, FilterResult>
  auto: AutoScoreMap
  ranks: Record<string, number>
} {
  const auto = computeAutoScores(vehicles, quotes, settings)
  const priceMap = buildPriceMap(vehicles, quotes, settings)
  const scores: Record<string, ScoreResult> = {}
  const filters: Record<string, FilterResult> = {}
  for (const vehicle of vehicles) {
    scores[vehicle.id] = computeScore(vehicle, scoring.mode, scoring.weights, auto[vehicle.id])
    filters[vehicle.id] = evaluateFilters(vehicle, priceMap[vehicle.id], settings)
  }
  const ordered = vehicles
    .filter((v) => scores[v.id].total !== null)
    .sort((a, b) => (scores[b.id].total ?? -1) - (scores[a.id].total ?? -1))
  const ranks: Record<string, number> = {}
  ordered.forEach((v, index) => {
    ranks[v.id] = index + 1
  })
  return { scores, filters, auto, ranks }
}

export function latestRankSnapshot(scoring: ScoringState) {
  return scoring.snapshots.length > 0
    ? scoring.snapshots.slice().sort((a, b) => b.at.localeCompare(a.at))[0]
    : null
}

export function rankDelta(
  scoring: ScoringState,
  vehicleId: string,
  currentRank: number | undefined,
  mode: 'manual' | 'auto' = scoring.mode,
): number | null {
  const snap = scoring.snapshots
    .filter((snapshot) => snapshot.mode === mode)
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  if (!snap || currentRank === undefined) return null
  const previous = snap.entries.find((e) => e.vehicleId === vehicleId)
  if (!previous) return null
  return previous.rank - currentRank
}

export function buildSnapshot(
  vehicles: Vehicle[],
  scores: Record<string, ScoreResult>,
  filters: Record<string, FilterResult>,
  ranks: Record<string, number>,
  mode: 'manual' | 'auto',
) {
  const entries = vehicles
    .filter((v) => ranks[v.id] !== undefined)
    .map((v) => ({
      vehicleId: v.id,
      score: scores[v.id].total,
      rank: ranks[v.id],
      coverage: scores[v.id].coverage,
      passesFilters: filters[v.id].status === 'pass' ? true : filters[v.id].status === 'fail' ? false : null,
    }))
    .sort((a, b) => a.rank - b.rank)
  return {
    id: `snap_${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    mode,
    entries,
  }
}
