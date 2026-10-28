export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function formatWan(yuan: number | null | undefined, digits = 2): string {
  if (!isNum(yuan)) return '待核实'
  return `${(yuan / 10000).toFixed(digits)} 万`
}

export function formatWanNumber(yuan: number | null | undefined, digits = 2): string {
  if (!isNum(yuan)) return '—'
  return (yuan / 10000).toFixed(digits)
}

export function formatYuan(yuan: number | null | undefined): string {
  if (!isNum(yuan)) return '待核实'
  return `¥${Math.round(yuan).toLocaleString('zh-CN')}`
}

export function formatNumber(value: number | null | undefined, unit = '', digits = 0): string {
  if (!isNum(value)) return '待核实'
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`
}

export function formatPercent(value: number | null | undefined, digits = 0, scale = 1): string {
  if (!isNum(value)) return '待核实'
  return `${(value * scale).toFixed(digits)}%`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = iso.slice(0, 10)
  const [y, m, d] = date.split('-')
  if (!y || !m || !d) return iso
  return `${y}.${m}.${d}`
}

export function formatDateCn(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = iso.slice(0, 10)
  const [y, m, d] = date.split('-')
  if (!y || !m || !d) return iso
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ts = Date.parse(iso.length <= 10 ? `${iso}T00:00:00+08:00` : iso)
  if (Number.isNaN(ts)) return null
  return Math.floor((Date.now() - ts) / 86400000)
}

export function monthsUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const target = new Date(`${iso.slice(0, 10)}T00:00:00+08:00`)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  if (months <= 0) return 0
  return target.getDate() >= now.getDate() ? months : months - 1
}

export function pct(value: number | null | undefined, digits = 0): string {
  if (!isNum(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return `${text.slice(0, length)}…`
}

export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function getInitials(text: string): string {
  const cleaned = text.trim()
  if (!cleaned) return '—'
  const latin = cleaned.match(/[A-Za-z0-9]+/g)
  if (latin && latin.join('').length >= 2) return latin.join('').slice(0, 2).toUpperCase()
  return cleaned.slice(0, 2)
}

export function idFromUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').split('/')[0]
}

export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
