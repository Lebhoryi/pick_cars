import type { CostAssumptions, CostResult, Vehicle, VehiclePriceInfo } from '@/types'
import { isNum } from '@/lib/format'

export function computeCost(
  vehicle: Vehicle,
  priceInfo: VehiclePriceInfo,
  assumptions: CostAssumptions,
): CostResult {
  const years = Math.max(1, assumptions.years)
  const annualKm = Math.max(0, assumptions.annualKm)
  const purchase = priceInfo.breakdown.landing
  const consumption = vehicle.specs.powertrain.consumption ?? assumptions.defaultConsumption
  const consumptionEstimated = vehicle.specs.powertrain.consumption === null
  const blendedPrice =
    assumptions.homeChargeRatio * assumptions.homePrice + (1 - assumptions.homeChargeRatio) * assumptions.publicPrice
  const energyPerYear = (annualKm / 100) * consumption * blendedPrice
  const insuranceTotal = Math.max(0, years - 1) * assumptions.insuranceAnnual
  const maintenanceTotal = years * assumptions.maintenanceAnnual
  const tiresTotal = years * assumptions.tiresAnnual
  const repairTotal = years * assumptions.repairAnnual
  const opportunityCost = purchase === null ? 0 : purchase * (assumptions.opportunityRate / 100) * years
  const residualRate = vehicle.specs.basic.residualRate ?? assumptions.residualRate
  const residualValue = purchase === null ? 0 : purchase * (residualRate / 100)

  const missing: string[] = []
  if (purchase === null) missing.push('落地价待核实')
  if (consumptionEstimated) missing.push('车型电耗缺失，暂用默认值')
  if (vehicle.specs.basic.residualRate === null) missing.push('残值率使用全局假设')
  if (priceInfo.quote === null) missing.push('尚无报价记录')

  const total =
    purchase === null
      ? null
      : purchase + energyPerYear * years + insuranceTotal + maintenanceTotal + tiresTotal + repairTotal + opportunityCost - residualValue

  const yearly: CostResult['yearly'] = []
  if (purchase !== null) {
    let cumulative = purchase
    for (let year = 1; year <= years; year += 1) {
      const other =
        maintenanceTotal / years +
        tiresTotal / years +
        repairTotal / years +
        (year > 1 ? assumptions.insuranceAnnual : 0) +
        opportunityCost / years
      cumulative += energyPerYear + other
      if (year === years) cumulative -= residualValue
      yearly.push({ year, cumulative, energy: energyPerYear, other })
    }
  }

  return {
    purchase,
    energyPerYear,
    energyTotal: energyPerYear * years,
    insuranceTotal,
    maintenanceTotal,
    tiresTotal,
    repairTotal,
    opportunityCost,
    residualValue,
    total,
    perKm: total === null ? null : total / (annualKm * years || 1),
    perYear: total === null ? null : total / years,
    missing,
    consumption,
    consumptionEstimated,
    yearly,
  }
}

export function energyCostPerKm(consumption: number, assumptions: CostAssumptions): number {
  const blendedPrice =
    assumptions.homeChargeRatio * assumptions.homePrice + (1 - assumptions.homeChargeRatio) * assumptions.publicPrice
  return (consumption / 100) * blendedPrice
}

export function describeCostAssumptions(assumptions: CostAssumptions): string {
  return [
    `持有 ${assumptions.years} 年`,
    `年行驶 ${assumptions.annualKm.toLocaleString('zh-CN')} km`,
    `家充 ${Math.round(assumptions.homeChargeRatio * 100)}% / 公共 ${Math.round((1 - assumptions.homeChargeRatio) * 100)}%`,
    `电价 ${assumptions.homePrice} / ${assumptions.publicPrice} 元/kWh`,
    `残值率 ${assumptions.residualRate}%`,
    `机会成本 ${assumptions.opportunityRate}%/年`,
  ].join(' · ')
}

export function isCostComplete(result: CostResult): boolean {
  return isNum(result.total)
}
