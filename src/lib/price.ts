import type { AppSettings, PriceBreakdown, PriceQuote, Vehicle, VehiclePriceInfo } from '@/types'
import { calcPurchaseTax } from '@/lib/tax'

export function quotesForVehicle(quotes: PriceQuote[], vehicleId: string): PriceQuote[] {
  return quotes
    .filter((q) => q.vehicleId === vehicleId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)))
}

export function latestQuote(quotes: PriceQuote[], vehicleId: string): PriceQuote | null {
  return quotesForVehicle(quotes, vehicleId)[0] ?? null
}

export function computeBreakdown(quote: PriceQuote | null, settings: AppSettings): PriceBreakdown {
  const insurance = quote?.insurance ?? settings.defaultInsurance
  const plateFee = quote?.plateFee ?? settings.defaultPlateFee
  const otherFee = quote?.otherFee ?? 0
  const cashOff = quote?.cashDiscount ?? 0
  const conditionalOff = quote && quote.includeConditional ? (quote.conditionalDiscount ?? 0) : 0
  const tradeInSubsidy = quote && quote.includeTradeIn ? (quote.tradeInSubsidy ?? 0) : 0
  const optionTotal = quote?.optionTotal ?? 0
  const adasPack = quote?.adasPack ?? 0
  const basePrice = quote ? (quote.dealerPrice ?? quote.officialPrice ?? quote.guidePrice) : null

  const missing: string[] = []
  if (!quote) missing.push('尚未记录报价')
  if (basePrice === null) missing.push('缺少车价')
  if (quote && quote.insurance === null) missing.push('保险为默认估算')
  if (quote && quote.plateFee === null) missing.push('上牌费为默认估算')
  if (quote && quote.taxOverride === null && basePrice !== null) missing.push('购置税为估算')

  const netCar = basePrice === null ? null : Math.max(0, basePrice - cashOff - conditionalOff)
  const taxableBase = netCar === null ? null : netCar + optionTotal + adasPack

  const taxResult = quote?.taxOverride !== null && quote?.taxOverride !== undefined
    ? {
        tax: quote.taxOverride,
        reduction: 0,
        policy: calcPurchaseTax(taxableBase, settings.targetPurchaseDate, settings.taxPolicy).policy,
        note: '购置税为手动覆盖值，请确认与购车时政策一致。',
      }
    : calcPurchaseTax(taxableBase, settings.targetPurchaseDate, settings.taxPolicy)

  const landing =
    netCar === null
      ? null
      : Math.max(0, netCar + optionTotal + adasPack + taxResult.tax + insurance + plateFee + otherFee - tradeInSubsidy)

  return {
    basePrice,
    cashOff,
    conditionalOff,
    netCar,
    optionTotal,
    adasPack,
    taxableBase,
    tax: taxResult.tax,
    taxReduction: taxResult.reduction,
    taxNote: taxResult.note,
    tradeInSubsidy,
    insurance,
    plateFee,
    otherFee,
    landing,
    budgetDelta: landing === null ? null : landing - settings.budgetMax,
    missing,
    policy: taxResult.policy,
    policyRate: taxResult.policy === 'half' ? 0.05 : taxResult.policy === 'exempt' ? 0 : 0.1,
    policyCap: taxResult.policy === 'half' ? 15000 : taxResult.policy === 'exempt' ? 30000 : 0,
  }
}

export function vehiclePriceInfo(
  vehicle: Vehicle,
  quotes: PriceQuote[],
  settings: AppSettings,
): VehiclePriceInfo {
  const vehicleQuotes = quotesForVehicle(quotes, vehicle.id)
  const quote = vehicleQuotes[0] ?? null
  return {
    quote,
    breakdown: computeBreakdown(quote, settings),
    quoteCount: vehicleQuotes.length,
    latestDate: quote?.date ?? null,
  }
}

export function buildPriceMap(
  vehicles: Vehicle[],
  quotes: PriceQuote[],
  settings: AppSettings,
): Record<string, VehiclePriceInfo> {
  const map: Record<string, VehiclePriceInfo> = {}
  for (const vehicle of vehicles) map[vehicle.id] = vehiclePriceInfo(vehicle, quotes, settings)
  return map
}

export function discountVsGuide(quote: PriceQuote | null): number | null {
  if (!quote) return null
  const current = quote.dealerPrice ?? quote.officialPrice
  if (current === null || quote.guidePrice === null) return null
  const net = Math.max(0, current - (quote.cashDiscount ?? 0))
  return quote.guidePrice - net
}
