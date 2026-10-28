import type { PriceQuote, Vehicle, VehiclePriceInfo } from '@/types'
import type { ScoreResult } from '@/types'
import { quotesForVehicle } from '@/lib/price'
import { vehicleName } from '@/lib/analytics'

export function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`
}

export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function vehiclesCsv(
  vehicles: Vehicle[],
  quotes: PriceQuote[],
  priceMap: Record<string, VehiclePriceInfo>,
  scores: Record<string, ScoreResult>,
): string {
  const headers = [
    '品牌',
    '车型',
    '年款',
    '具体版本',
    '车型类别',
    '能源类型',
    '驱动形式',
    '关注状态',
    '重点候选',
    '官方指导价(万元)',
    '当前官方价(万元)',
    '预计落地(万元)',
    '预算偏差(万元)',
    'CLTC(km)',
    '电池(kWh)',
    '电机功率(kW)',
    '轴距(mm)',
    '后备厢(L)',
    '智驾方案',
    '城市NOA',
    '综合评分',
    '数据覆盖率',
    '报价条数',
    '关注原因',
    '个人备注',
    '更新时间',
    '来源数量',
  ]
  const rows = vehicles.map((vehicle) => {
    const info = priceMap[vehicle.id]
    const quote = info?.quote
    const score = scores[vehicle.id]
    return [
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.trim,
      vehicle.bodyType,
      vehicle.energyType,
      vehicle.driveType,
      vehicle.focusStatus,
      vehicle.keyCandidate ? '是' : '否',
      quote?.guidePrice ? (quote.guidePrice / 10000).toFixed(2) : '',
      quote?.officialPrice ? (quote.officialPrice / 10000).toFixed(2) : '',
      info?.breakdown.landing ? (info.breakdown.landing / 10000).toFixed(2) : '',
      info?.breakdown.budgetDelta !== null && info?.breakdown.budgetDelta !== undefined
        ? (info.breakdown.budgetDelta / 10000).toFixed(2)
        : '',
      vehicle.specs.powertrain.cltcRange ?? '',
      vehicle.specs.powertrain.batteryKwh ?? '',
      vehicle.specs.powertrain.powerKw ?? '',
      vehicle.specs.body.wheelbase ?? '',
      vehicle.specs.body.trunkL ?? '',
      vehicle.specs.adas.solution,
      vehicle.specs.adas.cityNoa,
      score?.total ?? '',
      score ? `${(score.coverage * 100).toFixed(0)}%` : '',
      quotesForVehicle(quotes, vehicle.id).length,
      vehicle.reason,
      vehicle.notes,
      vehicle.updatedAt.slice(0, 10),
      vehicle.sources.length,
    ]
  })
  return toCsv([headers, ...rows])
}

export function compareCsv(vehicles: Vehicle[], rows: Array<{ group: string; label: string; values: string[] }>): string {
  const header = ['对比维度', '参数', ...vehicles.map((v) => `${vehicleName(v)} ${v.trim}`)]
  const body = rows.map((row) => [row.group, row.label, ...row.values])
  return toCsv([header, ...body])
}

export function costCsv(
  rows: Array<{
    name: string
    purchase: string
    energy: string
    insurance: string
    maintenance: string
    total: string
    perKm: string
  }>,
): string {
  return toCsv([
    ['车型', '购车落地(元)', '能源(元)', '保险(元)', '保养/轮胎/维修(元)', '总持有成本(元)', '每公里(元)'],
    ...rows.map((r) => [r.name, r.purchase, r.energy, r.insurance, r.maintenance, r.total, r.perKm]),
  ])
}
