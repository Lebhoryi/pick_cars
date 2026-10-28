// 领域模型：所有页面、计算逻辑与持久化都只依赖这里的结构。
// 数值型价格统一以「元」存储，展示层统一折算为「万元」。

export type ID = string

export const FOCUS_STATUSES = ['重点关注', '观察中', '暂时淘汰', '已购买'] as const
export type FocusStatus = (typeof FOCUS_STATUSES)[number]

export const VERIFICATION_LEVELS = ['官方', '媒体', '经销商', '实测', '个人', '待核实'] as const
export type Verification = (typeof VERIFICATION_LEVELS)[number]

export const BODY_TYPES = ['SUV', '轿车', '轿跑SUV', 'MPV', '其他', '待确认'] as const
export type BodyType = (typeof BODY_TYPES)[number]

export const ENERGY_TYPES = ['纯电', '增程', '插混', '轻混', '燃油', '待确认'] as const
export type EnergyType = (typeof ENERGY_TYPES)[number]

export const SOURCE_KINDS = ['official', 'media', 'dealer', 'test', 'user'] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  official: '官方',
  media: '媒体',
  dealer: '经销商',
  test: '实测',
  user: '个人',
}

export type ScoreDimId = 'price' | 'adas' | 'chassis' | 'range' | 'space' | 'cockpit' | 'brand'

export const SCORE_DIMS: ReadonlyArray<{
  id: ScoreDimId
  label: string
  short: string
  defaultWeight: number
  description: string
}> = [
  { id: 'price', label: '价格与性价比', short: '价格', defaultWeight: 20, description: '落地成本相对预算的水平，以及续航/配置与价格的比值。' },
  { id: 'adas', label: '智能驾驶', short: '智驾', defaultWeight: 20, description: '硬件规格、城市/高速领航可用性、开通与订阅成本。' },
  { id: 'chassis', label: '底盘与操控', short: '底盘', defaultWeight: 15, description: '悬架形式、阻尼/空悬、车身刚性、轮胎制动与调校。' },
  { id: 'range', label: '续航与充电', short: '续航', defaultWeight: 15, description: 'CLTC 续航、电耗、充电功率与 10–80% 补能时间、热管理。' },
  { id: 'space', label: '空间与舒适性', short: '空间', defaultWeight: 15, description: '轴距、后排空间、后备厢/前备厢与座椅舒适配置。' },
  { id: 'cockpit', label: '座舱与科技配置', short: '座舱', defaultWeight: 10, description: '车机芯片、屏幕、音响、互联、OTA 与舒适科技。' },
  { id: 'brand', label: '品牌、售后与保值', short: '品牌', defaultWeight: 5, description: '质保政策、服务网络、品牌稳定性与残值预期。' },
]

export const SCORE_DIM_IDS = SCORE_DIMS.map((d) => d.id)

export const TAX_POLICY_MODES = ['auto', 'exempt', 'half', 'full'] as const
export type TaxPolicyMode = (typeof TAX_POLICY_MODES)[number]

export const TAX_POLICY_LABELS: Record<TaxPolicyMode, string> = {
  auto: '按购车日期自动判断',
  exempt: '免征（2025 年前口径）',
  half: '减半征收（2026–2027）',
  full: '全额 10%',
}

export interface SourceRef {
  id: ID
  label: string
  url: string
  kind: SourceKind
  date?: string
  publisher?: string
  note?: string
}

export interface Provenance {
  status: Verification
  sourceId?: string
  url?: string
  checkedAt?: string
  note?: string
  condition?: string
}

export interface OptionPackage {
  id: ID
  name: string
  price: number | null
  kind: '智驾' | '舒适' | '外观' | '其他'
  includes: string
  required: boolean
  note?: string
}

export interface BasicSpecs {
  launchDate: string
  saleStatus: string
  seats: number | null
  warranty: string
  serviceNetwork: string
  residualRate: number | null
  platform: string
}

export interface PowertrainSpecs {
  batteryKwh: number | null
  batteryBrand: string
  batteryType: string
  cltcRange: number | null
  motorCount: number | null
  powerKw: number | null
  torqueNm: number | null
  accel0100: number | null
  topSpeed: number | null
  highVoltage: string
  peakChargeKw: number | null
  fastChargeTimeMin: number | null
  fastChargeSoc: string
  consumption: number | null
  batteryPreheat: boolean | null
  thermalMgmt: string
  realRangeSummer: number | null
  realRangeWinter: number | null
  v2lKw: number | null
}

export interface BodySpecs {
  length: number | null
  width: number | null
  height: number | null
  wheelbase: number | null
  curbWeight: number | null
  trunkL: number | null
  trunkMaxL: number | null
  frunkL: number | null
  rearLegroom: number | null
  rearHeadroom: number | null
  rearWidth: number | null
  seatFold: string
}

export interface ChassisSpecs {
  frontSusp: string
  rearSusp: string
  suspMaterial: string
  damping: string
  airSusp: boolean | null
  roadPreview: boolean | null
  tire: string
  brake: string
  turningRadius: number | null
  rigidity: number | null
  tuning: string
}

export interface ComfortSpecs {
  seatMaterial: string
  driverAdjust: string
  passengerAdjust: string
  seatMemory: string
  seatHeat: boolean | null
  seatVent: boolean | null
  seatMassage: boolean | null
  rearComfort: string
  audioBrand: string
  speakers: number | null
  acousticGlass: string
  climate: string
  rearVent: boolean | null
  fridge: boolean | null
  rearScreen: boolean | null
  sunshade: boolean | null
  chip: string
  screen: string
  hud: string
  os: string
  phoneLink: string
  ota: string
}

export interface AdasSpecs {
  solution: string
  supplier: string
  chip: string
  tops: number | null
  lidar: number | null
  lidarSpec: string
  cameras: number | null
  radars: number | null
  ultrasonic: number | null
  highSpeedNoa: string
  cityNoa: string
  autoPark: string
  coverage: string
  hardware: string
  softwareFee: string
  subscription: string
  upgrade: string
  experience: string
}

export interface SafetySpecs {
  airbags: number | null
  aeb: string
  structure: string
  batterySafety: string
  note: string
}

export interface VehicleSpecs {
  basic: BasicSpecs
  powertrain: PowertrainSpecs
  body: BodySpecs
  chassis: ChassisSpecs
  comfort: ComfortSpecs
  adas: AdasSpecs
  safety: SafetySpecs
}

export interface Vehicle {
  id: ID
  brand: string
  model: string
  year: string
  trim: string
  bodyType: BodyType
  energyType: EnergyType
  driveType: string
  focusStatus: FocusStatus
  keyCandidate: boolean
  accent: string
  coverImage?: string
  followedAt: string
  reason: string
  notes: string
  pros: string[]
  cons: string[]
  testDrive: string
  eliminateReason: string
  tags: string[]
  specs: VehicleSpecs
  provenance: Record<string, Provenance>
  sources: SourceRef[]
  optionPackages: OptionPackage[]
  manualScores: Record<ScoreDimId, number | null>
  createdAt: string
  updatedAt: string
}

export interface PriceQuote {
  id: ID
  vehicleId: ID
  date: string
  label: string
  guidePrice: number | null
  officialPrice: number | null
  dealerPrice: number | null
  limitedDiscount: number | null
  cashDiscount: number | null
  conditionalDiscount: number | null
  tradeInSubsidy: number | null
  optionTotal: number | null
  adasPack: number | null
  insurance: number | null
  plateFee: number | null
  otherFee: number | null
  taxOverride: number | null
  includeConditional: boolean
  includeTradeIn: boolean
  status: Verification
  sourceUrl: string
  sourceLabel: string
  conditions: string
  note: string
  createdAt: string
}

export interface HardFilters {
  maxLanding: number | null
  minRange: number | null
  requireCityNoa: boolean
  requireLidar: boolean
  keyOnly: boolean
}

export interface CostAssumptions {
  years: number
  annualKm: number
  homeChargeRatio: number
  homePrice: number
  publicPrice: number
  defaultConsumption: number
  insuranceAnnual: number
  maintenanceAnnual: number
  tiresAnnual: number
  repairAnnual: number
  residualRate: number
  opportunityRate: number
}

export interface AppSettings {
  ownerName: string
  budgetMin: number
  budgetMax: number
  targetPurchaseDate: string
  purchaseCity: string
  taxPolicy: TaxPolicyMode
  defaultInsurance: number
  defaultPlateFee: number
  staleDays: number
  hardFilters: HardFilters
  cost: CostAssumptions
}

export interface RankEntry {
  vehicleId: ID
  score: number | null
  rank: number
  coverage: number
  passesFilters: boolean | null
}

export interface RankSnapshot {
  id: ID
  at: string
  mode: 'manual' | 'auto'
  entries: RankEntry[]
}

export interface ScoringState {
  mode: 'manual' | 'auto'
  weights: Record<ScoreDimId, number>
  snapshots: RankSnapshot[]
}

export interface AppData {
  version: number
  vehicles: Vehicle[]
  quotes: PriceQuote[]
  settings: AppSettings
  scoring: ScoringState
  compareIds: ID[]
}

export type PageKey = 'overview' | 'garage' | 'compare' | 'score' | 'prices' | 'cost' | 'data' | 'settings'

export interface ScoreResult {
  total: number | null
  coverage: number
  dims: Record<
    ScoreDimId,
    {
      score: number | null
      weight: number
      effectiveWeight: number
      source: 'manual' | 'auto' | 'none'
      basis?: string
      criteria?: Array<{ label: string; met: boolean; available: boolean; detail: string }>
      missing?: string[]
    }
  >
}

export interface PriceBreakdown {
  basePrice: number | null
  cashOff: number
  conditionalOff: number
  netCar: number | null
  optionTotal: number
  adasPack: number
  taxableBase: number | null
  tax: number
  taxReduction: number
  taxNote: string
  tradeInSubsidy: number
  insurance: number
  plateFee: number
  otherFee: number
  landing: number | null
  budgetDelta: number | null
  missing: string[]
  policy: Exclude<TaxPolicyMode, 'auto'>
  policyRate: number
  policyCap: number
}

export interface VehiclePriceInfo {
  quote: PriceQuote | null
  breakdown: PriceBreakdown
  quoteCount: number
  latestDate: string | null
}

export interface FilterResult {
  status: 'pass' | 'fail' | 'unknown'
  reasons: string[]
}

export interface CostResult {
  purchase: number | null
  energyPerYear: number
  energyTotal: number
  insuranceTotal: number
  maintenanceTotal: number
  tiresTotal: number
  repairTotal: number
  opportunityCost: number
  residualValue: number
  total: number | null
  perKm: number | null
  perYear: number | null
  missing: string[]
  consumption: number
  consumptionEstimated: boolean
  yearly: Array<{ year: number; cumulative: number; energy: number; other: number }>
}
