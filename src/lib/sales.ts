// 销量口径
// 统计窗口 = max(上市月, 2026-01) → 全库最新已公布月份。
// 2026-01 之前的销量不计入（2026 年购置税减半、口径切换，只做 2026 年以来的同窗口比较）。
import type { SalesMonthPoint, SalesRecord, SalesSummary, Vehicle } from '@/types'
import { SALES_SCOPES } from '@/types'

export const SALES_WINDOW_START = '2026-01'

/** 从任意文本里抠出 YYYY-MM，例如「2026-09」「2025-07（配置表适用…）」 */
export function normalizeMonth(value: string | null | undefined): string | null {
  if (!value) return null
  const matched = /(\d{4})\s*[-/年.]\s*(\d{1,2})/.exec(value.trim())
  if (!matched) return null
  const month = Number(matched[2])
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  return `${matched[1]}-${String(month).padStart(2, '0')}`
}

function parseMonth(month: string): { year: number; month: number } | null {
  const matched = /^(\d{4})-(\d{2})$/.exec(month)
  if (!matched) return null
  return { year: Number(matched[1]), month: Number(matched[2]) }
}

export function monthIndex(month: string): number {
  const parsed = parseMonth(month)
  if (!parsed) return 0
  return parsed.year * 12 + (parsed.month - 1)
}

export function addMonths(month: string, delta: number): string {
  const parsed = parseMonth(month)
  if (!parsed) return month
  const total = monthIndex(month) + delta
  const year = Math.floor(total / 12)
  const m = (total % 12) + 1
  return `${year}-${String(m).padStart(2, '0')}`
}

export function monthRange(start: string, end: string): string[] {
  if (monthIndex(start) > monthIndex(end)) return []
  const out: string[] = []
  let cursor = start
  while (monthIndex(cursor) <= monthIndex(end)) {
    out.push(cursor)
    cursor = addMonths(cursor, 1)
  }
  return out
}

/** 2026-10 → 26/10 */
export function shortMonth(month: string): string {
  const parsed = parseMonth(month)
  if (!parsed) return month
  return `${String(parsed.year).slice(2)}/${String(parsed.month).padStart(2, '0')}`
}

/** 2026-10 → 2026 年 10 月 */
export function monthLabel(month: string): string {
  const parsed = parseMonth(month)
  if (!parsed) return month
  return `${parsed.year} 年 ${parsed.month} 月`
}

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function launchMonthOf(vehicle: Vehicle): string | null {
  return normalizeMonth(vehicle.specs.basic.launchDate)
}

/** 窗口起点：上市月与 2026-01 取较晚者；上市时间未知时按 2026-01 */
export function windowStartOf(vehicle: Vehicle): string {
  const launch = launchMonthOf(vehicle)
  if (!launch) return SALES_WINDOW_START
  return monthIndex(launch) > monthIndex(SALES_WINDOW_START) ? launch : SALES_WINDOW_START
}

/** 全库最新「有数字」的月份，作为所有车型统一的窗口终点 */
export function latestPublishedMonth(records: SalesRecord[]): string | null {
  let latest: string | null = null
  for (const record of records) {
    if (record.units === null) continue
    if (!latest || monthIndex(record.month) > monthIndex(latest)) latest = record.month
  }
  return latest
}

export function summarizeSales(
  vehicle: Vehicle,
  records: SalesRecord[],
  windowEnd: string,
): SalesSummary {
  const windowStart = windowStartOf(vehicle)
  const months = monthRange(windowStart, windowEnd)
  const byMonth = new Map<string, SalesRecord>()
  for (const record of records) {
    if (record.vehicleId !== vehicle.id) continue
    byMonth.set(record.month, record)
  }

  const series: SalesMonthPoint[] = months.map((month) => {
    const record = byMonth.get(month)
    return {
      month,
      units: record?.units ?? null,
      scope: record?.scope ?? null,
      status: record?.status ?? null,
      note: record?.note ?? '',
    }
  })

  const recorded = series.filter((point) => typeof point.units === 'number')
  const tracked = series.filter((point) => point.units !== null || byMonth.has(point.month))
  const cumulative = recorded.length > 0 ? recorded.reduce((sum, point) => sum + (point.units ?? 0), 0) : null
  const withNumber = recorded.filter((point): point is SalesMonthPoint & { units: number } => typeof point.units === 'number')
  const latestPoint = withNumber[withNumber.length - 1] ?? null

  return {
    windowStart,
    windowEnd,
    launchMonth: launchMonthOf(vehicle),
    months,
    recordedMonths: recorded.length,
    trackedMonths: tracked.length,
    expectedMonths: months.length,
    coverage: months.length === 0 ? 0 : recorded.length / months.length,
    cumulative,
    monthlyAvg: cumulative !== null && recorded.length > 0 ? Math.round(cumulative / recorded.length) : null,
    latest: latestPoint ? { month: latestPoint.month, units: latestPoint.units } : null,
    series,
    hasData: recorded.length > 0,
  }
}

export function buildSalesMap(vehicles: Vehicle[], records: SalesRecord[]): Record<string, SalesSummary> {
  const windowEnd = latestPublishedMonth(records) ?? SALES_WINDOW_START
  const out: Record<string, SalesSummary> = {}
  for (const vehicle of vehicles) out[vehicle.id] = summarizeSales(vehicle, records, windowEnd)
  return out
}

/** 10152 → 1.02 万；2332 → 2,332 */
export function formatUnits(units: number | null | undefined, digits = 2): string {
  if (units === null || units === undefined || !Number.isFinite(units)) return '待核实'
  if (Math.abs(units) >= 10000) return `${(units / 10000).toFixed(digits)} 万`
  return units.toLocaleString('zh-CN')
}

/** 紧凑写法，用于图表/角标：10152 → 1.0 万 */
export function formatUnitsCompact(units: number | null | undefined): string {
  if (units === null || units === undefined || !Number.isFinite(units)) return '—'
  if (Math.abs(units) >= 10000) return `${(units / 10000).toFixed(1)} 万`
  return units.toLocaleString('zh-CN')
}

export function isSalesScope(value: unknown): boolean {
  return typeof value === 'string' && (SALES_SCOPES as readonly string[]).includes(value)
}
