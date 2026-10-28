import type {
  AdasSpecs,
  AppSettings,
  BasicSpecs,
  BodySpecs,
  ChassisSpecs,
  ComfortSpecs,
  CostAssumptions,
  PriceQuote,
  PowertrainSpecs,
  SafetySpecs,
  ScoreDimId,
  ScoringState,
  Vehicle,
  VehicleSpecs,
} from '@/types'
import { SCORE_DIMS } from '@/types'

export const APP_VERSION = 1
export const STORAGE_KEY = 'carfleet.data.v1'
export const CORRUPT_KEY_PREFIX = 'carfleet.corrupt.'

export const ACCENTS = ['#5eead4', '#7dd3fc', '#c4b5fd', '#fbbf24', '#fb7185', '#a3e635', '#f0abfc'] as const

export function uid(prefix = 'id'): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${uuid.replace(/-/g, '').slice(0, 12)}`
}

export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function blankBasic(): BasicSpecs {
  return {
    launchDate: '',
    saleStatus: '在售',
    seats: null,
    warranty: '',
    serviceNetwork: '',
    residualRate: null,
    platform: '',
  }
}

export function blankPowertrain(): PowertrainSpecs {
  return {
    batteryKwh: null,
    batteryBrand: '',
    batteryType: '',
    cltcRange: null,
    motorCount: null,
    powerKw: null,
    torqueNm: null,
    accel0100: null,
    topSpeed: null,
    highVoltage: '',
    peakChargeKw: null,
    fastChargeTimeMin: null,
    fastChargeSoc: '',
    consumption: null,
    batteryPreheat: null,
    thermalMgmt: '',
    realRangeSummer: null,
    realRangeWinter: null,
    v2lKw: null,
  }
}

export function blankBody(): BodySpecs {
  return {
    length: null,
    width: null,
    height: null,
    wheelbase: null,
    curbWeight: null,
    trunkL: null,
    trunkMaxL: null,
    frunkL: null,
    rearLegroom: null,
    rearHeadroom: null,
    rearWidth: null,
    seatFold: '',
  }
}

export function blankChassis(): ChassisSpecs {
  return {
    frontSusp: '',
    rearSusp: '',
    suspMaterial: '',
    damping: '',
    airSusp: null,
    roadPreview: null,
    tire: '',
    brake: '',
    turningRadius: null,
    rigidity: null,
    tuning: '',
  }
}

export function blankComfort(): ComfortSpecs {
  return {
    seatMaterial: '',
    driverAdjust: '',
    passengerAdjust: '',
    seatMemory: '',
    seatHeat: null,
    seatVent: null,
    seatMassage: null,
    rearComfort: '',
    audioBrand: '',
    speakers: null,
    acousticGlass: '',
    climate: '',
    rearVent: null,
    fridge: null,
    rearScreen: null,
    sunshade: null,
    chip: '',
    screen: '',
    hud: '',
    os: '',
    phoneLink: '',
    ota: '',
  }
}

export function blankAdas(): AdasSpecs {
  return {
    solution: '',
    supplier: '',
    chip: '',
    tops: null,
    lidar: null,
    lidarSpec: '',
    cameras: null,
    radars: null,
    ultrasonic: null,
    highSpeedNoa: '',
    cityNoa: '',
    autoPark: '',
    coverage: '',
    hardware: '',
    softwareFee: '',
    subscription: '',
    upgrade: '',
    experience: '',
  }
}

export function blankSafety(): SafetySpecs {
  return {
    airbags: null,
    aeb: '',
    structure: '',
    batterySafety: '',
    note: '',
  }
}

export function blankSpecs(): VehicleSpecs {
  return {
    basic: blankBasic(),
    powertrain: blankPowertrain(),
    body: blankBody(),
    chassis: blankChassis(),
    comfort: blankComfort(),
    adas: blankAdas(),
    safety: blankSafety(),
  }
}

export function blankManualScores(): Record<ScoreDimId, number | null> {
  const out = {} as Record<ScoreDimId, number | null>
  for (const d of SCORE_DIMS) out[d.id] = null
  return out
}

export function blankVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  const now = new Date().toISOString()
  return {
    id: uid('veh'),
    brand: '',
    model: '',
    year: '待确认',
    trim: '',
    bodyType: 'SUV',
    energyType: '纯电',
    driveType: '',
    focusStatus: '观察中',
    keyCandidate: false,
    accent: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
    followedAt: todayISO(),
    reason: '',
    notes: '',
    pros: [],
    cons: [],
    testDrive: '',
    eliminateReason: '',
    tags: [],
    specs: blankSpecs(),
    provenance: {},
    sources: [],
    optionPackages: [],
    manualScores: blankManualScores(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function blankQuote(vehicleId: string, overrides: Partial<PriceQuote> = {}): PriceQuote {
  const today = todayISO()
  return {
    id: uid('quote'),
    vehicleId,
    date: today,
    label: '新增报价',
    guidePrice: null,
    officialPrice: null,
    dealerPrice: null,
    limitedDiscount: null,
    cashDiscount: null,
    conditionalDiscount: null,
    tradeInSubsidy: null,
    optionTotal: null,
    adasPack: null,
    insurance: null,
    plateFee: null,
    otherFee: null,
    taxOverride: null,
    includeConditional: false,
    includeTradeIn: false,
    status: '待核实',
    sourceUrl: '',
    sourceLabel: '',
    conditions: '',
    note: '',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export const defaultCostAssumptions: CostAssumptions = {
  years: 5,
  annualKm: 15000,
  homeChargeRatio: 0.7,
  homePrice: 0.5,
  publicPrice: 1.2,
  defaultConsumption: 15,
  insuranceAnnual: 5500,
  maintenanceAnnual: 800,
  tiresAnnual: 1200,
  repairAnnual: 1000,
  residualRate: 45,
  opportunityRate: 3,
}

export function defaultSettings(): AppSettings {
  return {
    ownerName: '车主',
    budgetMin: 150000,
    budgetMax: 200000,
    targetPurchaseDate: '2027-06-30',
    purchaseCity: '待填写',
    taxPolicy: 'auto',
    defaultInsurance: 6500,
    defaultPlateFee: 500,
    staleDays: 90,
    hardFilters: {
      maxLanding: 200000,
      minRange: 600,
      requireCityNoa: false,
      requireLidar: false,
      keyOnly: false,
    },
    cost: { ...defaultCostAssumptions },
  }
}

export function defaultScoring(): ScoringState {
  const weights = {} as Record<ScoreDimId, number>
  for (const d of SCORE_DIMS) weights[d.id] = d.defaultWeight
  return { mode: 'manual', weights, snapshots: [] }
}

export function defaultData(): import('@/types').AppData {
  return {
    version: APP_VERSION,
    vehicles: [],
    quotes: [],
    settings: defaultSettings(),
    scoring: defaultScoring(),
    compareIds: [],
  }
}
