import type { TaxPolicyMode } from '@/types'

const VAT_RATE = 0.13
const PURCHASE_TAX_RATE = 0.1
const EXEMPT_CAP = 30000
const HALF_REDUCTION_CAP = 15000

export interface TaxResult {
  tax: number
  grossTax: number
  reduction: number
  rate: number
  policy: Exclude<TaxPolicyMode, 'auto'>
  note: string
}

export function resolvePolicy(mode: TaxPolicyMode, purchaseDate: string): Exclude<TaxPolicyMode, 'auto'> {
  if (mode !== 'auto') return mode
  const date = purchaseDate.slice(0, 10)
  if (date >= '2024-01-01' && date <= '2027-12-31') {
    return date <= '2025-12-31' ? 'exempt' : 'half'
  }
  return 'full'
}

/**
 * 中国乘用车车辆购置税估算。
 * 计税价格按含增值税成交价换算为不含税价（÷1.13）。
 * 2024–2025：免征，减税额上限 3 万元/辆。
 * 2026–2027：减半征收（实际 5%），减税额上限 1.5 万元/辆。
 * 2028 起：按 10% 全额（默认假设，购车时以有效政策为准）。
 */
export function calcPurchaseTax(
  taxIncludedPrice: number | null,
  purchaseDate: string,
  mode: TaxPolicyMode = 'auto',
): TaxResult {
  const policy = resolvePolicy(mode, purchaseDate)
  if (taxIncludedPrice === null || !Number.isFinite(taxIncludedPrice) || taxIncludedPrice <= 0) {
    return {
      tax: 0,
      grossTax: 0,
      reduction: 0,
      rate: PURCHASE_TAX_RATE,
      policy,
      note: '缺少计税价格，购置税待核实。',
    }
  }

  const netPrice = taxIncludedPrice / (1 + VAT_RATE)
  const grossTax = netPrice * PURCHASE_TAX_RATE
  let reduction = 0
  if (policy === 'exempt') reduction = Math.min(grossTax, EXEMPT_CAP)
  if (policy === 'half') reduction = Math.min(grossTax * 0.5, HALF_REDUCTION_CAP)
  const tax = Math.max(0, grossTax - reduction)

  const note =
    policy === 'exempt'
      ? `按免征政策估算，减税额上限 3 万元/辆（政策口径截至 2025-12-31）。`
      : policy === 'half'
        ? `按 2026–2027 年减半征收估算：税率 5%，减税额上限 1.5 万元/辆。`
        : `按 10% 全额征收估算，未考虑地方补贴或目录资格变化。`

  return { tax, grossTax, reduction, rate: PURCHASE_TAX_RATE, policy, note }
}

export function taxPolicyShort(policy: Exclude<TaxPolicyMode, 'auto'>): string {
  if (policy === 'exempt') return '免征'
  if (policy === 'half') return '减半 · 5%'
  return '全额 · 10%'
}
