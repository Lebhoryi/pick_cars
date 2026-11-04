import type { Vehicle } from '@/types'

export interface ParsedRow {
  line: string
  vehicleId: string | null
  vehicleName: string
  units: number | null
}

export interface ParseResult {
  rows: ParsedRow[]
  matchedCount: number
  unmatched: string[]
}

/** 去掉空格、全角空格、连字符，统一小写，便于比对车型名 */
function norm(text: string): string {
  return text
    .replace(/[\s\u3000\-_.·・]/g, '')
    .toLowerCase()
}

/** 车型的候选匹配串，长串优先 */
function keysOf(vehicle: Vehicle): string[] {
  const brand = norm(vehicle.brand)
  const model = norm(vehicle.model)
  const trimNoYear = model.replace(/款$/, '')
  return Array.from(new Set([`${brand}${model}`, `${brand}${trimNoYear}`, model, trimNoYear])).filter((key) => key.length >= 2)
}

/** 去掉每行开头的排名（1 / 1. / No.1 / 1、） */
function stripRank(line: string): string {
  return line.replace(/^\s*(?:no\.?\s*)?\d{1,3}\s*[.、)）:：]?\s+/i, '').trim()
}

/** 抓一行里的数字（支持千分位、支持「1.2万」） */
function numbersOf(text: string): number[] {
  const out: number[] = []
  const re = /(\d[\d,]*(?:\.\d+)?)\s*(万)?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const raw = Number(match[1].replace(/,/g, ''))
    if (!Number.isFinite(raw)) continue
    out.push(match[2] ? Math.round(raw * 10000) : Math.round(raw))
  }
  return out
}

export function parseSalesPaste(text: string, vehicles: Vehicle[]): ParseResult {
  const keys = vehicles
    .map((vehicle) => ({ vehicle, keys: keysOf(vehicle) }))
    .flatMap((entry) => entry.keys.map((key) => ({ ...entry, key })))
    .sort((a, b) => b.key.length - a.key.length)

  const rows: ParsedRow[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const stripped = stripRank(line)
    const flat = norm(stripped)

    const hit = keys.find((entry) => flat.includes(entry.key))
    if (!hit) {
      // 只把含中文或字母的行算作「没匹配上」，纯数字/表头忽略
      if (/[\u4e00-\u9fa5a-z]/i.test(line)) rows.push({ line, vehicleId: null, vehicleName: '', units: null })
      continue
    }

    // 车型名之后的部分才取数字，避免把「06」「07」这类型号里的数字当销量
    const nameFlat = norm(stripped)
    const idx = nameFlat.indexOf(hit.key)
    const tail = stripped.slice(Math.min(stripped.length, idx + hit.key.length))
    const candidates = numbersOf(tail).filter((n) => n >= 1 && n <= 2_000_000)
    // 销量通常是这一行里最大的数字（避开排名/占比），取第一个 ≥100 的
    const units = candidates.find((n) => n >= 100) ?? candidates[0] ?? null

    rows.push({ line, vehicleId: hit.vehicle.id, vehicleName: `${hit.vehicle.brand} ${hit.vehicle.model}`, units })
  }

  const matched = rows.filter((row) => row.vehicleId && row.units !== null)
  return {
    rows,
    matchedCount: matched.length,
    unmatched: rows.filter((row) => !row.vehicleId).map((row) => row.line),
  }
}
