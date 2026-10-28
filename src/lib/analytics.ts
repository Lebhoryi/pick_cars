import type { AppSettings, PriceQuote, Vehicle, VehiclePriceInfo } from '@/types'
import { ALL_SPEC_FIELDS } from '@/data/specSchema'
import { computeBreakdown, quotesForVehicle } from '@/lib/price'
import { daysSince, isNum } from '@/lib/format'

export interface DataGap {
  vehicleId: string
  vehicleName: string
  path: string
  label: string
  kind: 'missing' | 'unverified' | 'stale' | 'price'
  detail: string
}

const PRIORITY_PATHS = new Set([
  'powertrain.cltcRange',
  'powertrain.batteryKwh',
  'powertrain.powerKw',
  'body.length',
  'body.wheelbase',
  'body.trunkL',
  'chassis.frontSusp',
  'chassis.rearSusp',
  'chassis.damping',
  'comfort.chip',
  'comfort.screen',
  'adas.solution',
  'adas.tops',
  'adas.lidar',
  'adas.cityNoa',
  'basic.warranty',
  'basic.residualRate',
  'basic.serviceNetwork',
])

export function vehicleName(vehicle: Vehicle): string {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ')
}

export function fullVehicleName(vehicle: Vehicle): string {
  return [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(' ')
}

export function collectGaps(vehicles: Vehicle[], settings: AppSettings): DataGap[] {
  const gaps: DataGap[] = []
  for (const vehicle of vehicles) {
    const name = vehicleName(vehicle)
    for (const { path, field } of ALL_SPEC_FIELDS) {
      if (!PRIORITY_PATHS.has(path)) continue
      const [group, key] = path.split('.')
      const value = (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[group]?.[key]
      const prov = vehicle.provenance[path]
      if (value === null || value === undefined || value === '' || value === '待核实') {
        gaps.push({
          vehicleId: vehicle.id,
          vehicleName: name,
          path,
          label: field.label,
          kind: 'missing',
          detail: '尚未录入',
        })
        continue
      }
      if (prov?.status === '待核实') {
        gaps.push({
          vehicleId: vehicle.id,
          vehicleName: name,
          path,
          label: field.label,
          kind: 'unverified',
          detail: '数值已录入但来源待核实',
        })
        continue
      }
      const age = daysSince(prov?.checkedAt)
      if (age !== null && age > settings.staleDays) {
        gaps.push({
          vehicleId: vehicle.id,
          vehicleName: name,
          path,
          label: field.label,
          kind: 'stale',
          detail: `核实日期距今 ${age} 天，建议复核`,
        })
      }
    }
    if (vehicle.sources.length === 0) {
      gaps.push({
        vehicleId: vehicle.id,
        vehicleName: name,
        path: 'sources',
        label: '资料来源',
        kind: 'missing',
        detail: '未添加任何来源链接',
      })
    }
  }
  const order = { missing: 0, unverified: 1, price: 2, stale: 3 }
  return gaps.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 40)
}

export interface PriceMovement {
  vehicleId: string
  vehicleName: string
  fromDate: string
  toDate: string
  fromLanding: number | null
  toLanding: number | null
  delta: number
  quoteId: string
}

export function priceMovements(
  vehicles: Vehicle[],
  quotes: PriceQuote[],
  settings: AppSettings,
): PriceMovement[] {
  const out: PriceMovement[] = []
  for (const vehicle of vehicles) {
    const list = quotesForVehicle(quotes, vehicle.id)
      .slice()
      .reverse()
    for (let i = 1; i < list.length; i += 1) {
      const prev = computeBreakdown(list[i - 1], settings).landing
      const next = computeBreakdown(list[i], settings).landing
      if (!isNum(prev) || !isNum(next)) continue
      out.push({
        vehicleId: vehicle.id,
        vehicleName: vehicleName(vehicle),
        fromDate: list[i - 1].date,
        toDate: list[i].date,
        fromLanding: prev,
        toLanding: next,
        delta: next - prev,
        quoteId: list[i].id,
      })
    }
  }
  return out.sort((a, b) => b.toDate.localeCompare(a.toDate))
}

export function dataCompleteness(vehicle: Vehicle): number {
  let total = 0
  let filled = 0
  for (const { path } of ALL_SPEC_FIELDS) {
    if (!PRIORITY_PATHS.has(path)) continue
    total += 1
    const [group, key] = path.split('.')
    const value = (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[group]?.[key]
    const prov = vehicle.provenance[path]
    if (value === null || value === undefined || value === '' || value === '待核实') continue
    if (prov?.status === '待核实') continue
    filled += 1
  }
  return total === 0 ? 0 : filled / total
}

export function dataHealth(vehicles: Vehicle[]): { official: number; media: number; unverified: number; total: number } {
  let official = 0
  let media = 0
  let unverified = 0
  for (const vehicle of vehicles) {
    for (const prov of Object.values(vehicle.provenance)) {
      if (prov.status === '官方') official += 1
      else if (prov.status === '媒体' || prov.status === '经销商' || prov.status === '实测') media += 1
      else unverified += 1
    }
  }
  return { official, media, unverified, total: official + media + unverified }
}

export function landingRange(priceMap: Record<string, VehiclePriceInfo>): {
  min: number | null
  max: number | null
  count: number
} {
  const values = Object.values(priceMap)
    .map((info) => info.breakdown.landing)
    .filter((v): v is number => isNum(v))
  if (values.length === 0) return { min: null, max: null, count: 0 }
  return { min: Math.min(...values), max: Math.max(...values), count: values.length }
}

export function focusCounts(vehicles: Vehicle[]): Record<string, number> {
  return vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.focusStatus] = (acc[v.focusStatus] ?? 0) + 1
    return acc
  }, {})
}
