import type {
  AppData,
  AppSettings,
  PriceQuote,
  Provenance,
  RankSnapshot,
  ReviewRecord,
  SalesRecord,
  ScoringState,
  SourceRef,
  Vehicle,
  VehicleSpecs,
} from '@/types'
import {
  FOCUS_STATUSES,
  REVIEW_CHANNELS,
  REVIEW_STANCES,
  SALES_SCOPES,
  SCORE_DIM_IDS,
  SOURCE_KINDS,
  TAX_POLICY_MODES,
  VERIFICATION_LEVELS,
} from '@/types'
import {
  ACCENTS,
  APP_VERSION,
  CORRUPT_KEY_PREFIX,
  STORAGE_KEY,
  blankQuote,
  blankSpecs,
  blankVehicle,
  defaultScoring,
  defaultSettings,
  todayISO,
  uid,
} from '@/lib/defaults'
import { ALL_SPEC_FIELDS } from '@/data/specSchema'
import { seedData } from '@/data/seed'
import { clamp, isNum, toNumberOrNull } from '@/lib/format'
import { normalizeMonth } from '@/lib/sales'

type Rec = Record<string, unknown>

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function numOrNull(value: unknown): number | null {
  return toNumberOrNull(value)
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim())
}

function normalizeSources(value: unknown): SourceRef[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .map((raw) => ({
      id: str(raw.id) || uid('src'),
      label: str(raw.label) || '未命名来源',
      url: str(raw.url),
      kind: oneOf(raw.kind, SOURCE_KINDS, 'media'),
      date: str(raw.date) || undefined,
      publisher: str(raw.publisher) || undefined,
      note: str(raw.note) || undefined,
    }))
    .filter((s) => s.label !== '未命名来源' || s.url !== '')
}

function normalizeProvenance(value: unknown): Record<string, Provenance> {
  if (!isRecord(value)) return {}
  const out: Record<string, Provenance> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue
    out[key] = {
      status: oneOf(raw.status, VERIFICATION_LEVELS, '待核实'),
      sourceId: str(raw.sourceId) || undefined,
      url: str(raw.url) || undefined,
      checkedAt: str(raw.checkedAt) || undefined,
      note: str(raw.note) || undefined,
      condition: str(raw.condition) || undefined,
    }
  }
  return out
}

function normalizeSpecs(value: unknown, warnings: string[], vehicleName: string): VehicleSpecs {
  const specs = blankSpecs()
  if (!isRecord(value)) {
    warnings.push(`${vehicleName}：缺少参数对象，已用空参数初始化`)
    return specs
  }
  for (const { path, field } of ALL_SPEC_FIELDS) {
    const [group, key] = path.split('.')
    const groupRaw = value[group]
    if (!isRecord(groupRaw)) continue
    const raw = groupRaw[key]
    if (raw === undefined) continue
    const target = (specs as unknown as Record<string, Record<string, unknown>>)[group]
    if (field.type === 'number') target[key] = numOrNull(raw)
    else if (field.type === 'boolean') target[key] = boolOrNull(raw)
    else if (field.type === 'select') {
      const text = str(raw)
      if (text && field.options && !field.options.includes(text)) {
        warnings.push(`${vehicleName}：${field.label}「${text}」不在预设选项内，已保留`)
      }
      target[key] = text
    } else target[key] = str(raw)
  }
  return specs
}

function normalizeManualScores(value: unknown): Vehicle['manualScores'] {
  const out = blankVehicle().manualScores
  if (!isRecord(value)) return out
  for (const id of SCORE_DIM_IDS) {
    const n = numOrNull(value[id])
    out[id] = n === null ? null : clamp(Math.round(n * 10) / 10, 0, 10)
  }
  return out
}

export function normalizeVehicle(raw: unknown, index: number, warnings: string[]): Vehicle | null {
  if (!isRecord(raw)) {
    warnings.push(`第 ${index + 1} 个车型不是对象，已跳过`)
    return null
  }
  const brand = str(raw.brand).trim()
  const model = str(raw.model).trim()
  if (!brand && !model) {
    warnings.push(`第 ${index + 1} 个车型缺少品牌/车型名，已跳过`)
    return null
  }
  const vehicle = blankVehicle()
  const name = [brand, model, str(raw.trim)].filter(Boolean).join(' ')
  const specs = normalizeSpecs(raw.specs, warnings, name || `第 ${index + 1} 个车型`)

  return {
    ...vehicle,
    id: str(raw.id) || uid('veh'),
    brand,
    model,
    year: str(raw.year, '待确认') || '待确认',
    trim: str(raw.trim),
    bodyType: oneOf(raw.bodyType, ['SUV', '轿车', '轿跑SUV', 'MPV', '其他', '待确认'] as const, '待确认'),
    energyType: oneOf(raw.energyType, ['纯电', '增程', '插混', '轻混', '燃油', '待确认'] as const, '待确认'),
    driveType: str(raw.driveType),
    focusStatus: oneOf(raw.focusStatus, FOCUS_STATUSES, '观察中'),
    keyCandidate: raw.keyCandidate === true,
    accent: /^#[0-9a-fA-F]{6}$/.test(str(raw.accent)) ? str(raw.accent) : ACCENTS[index % ACCENTS.length],
    coverImage: typeof raw.coverImage === 'string' && raw.coverImage.length > 0 ? raw.coverImage : undefined,
    coverWide: typeof raw.coverWide === 'string' && raw.coverWide.length > 0 ? raw.coverWide : undefined,
    imageCredit: str(raw.imageCredit) || undefined,
    followedAt: str(raw.followedAt) || todayISO(),
    reason: str(raw.reason),
    notes: str(raw.notes),
    pros: stringArray(raw.pros),
    cons: stringArray(raw.cons),
    testDrive: str(raw.testDrive),
    eliminateReason: str(raw.eliminateReason),
    tags: stringArray(raw.tags),
    specs,
    provenance: normalizeProvenance(raw.provenance),
    sources: normalizeSources(raw.sources),
    optionPackages: Array.isArray(raw.optionPackages)
      ? raw.optionPackages.filter(isRecord).map((pkg) => ({
          id: str(pkg.id) || uid('opt'),
          name: str(pkg.name) || '未命名选装包',
          price: numOrNull(pkg.price),
          kind: oneOf(pkg.kind, ['智驾', '舒适', '外观', '其他'] as const, '其他'),
          includes: str(pkg.includes),
          required: pkg.required === true,
          note: str(pkg.note) || undefined,
        }))
      : [],
    manualScores: normalizeManualScores(raw.manualScores),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
    updatedAt: str(raw.updatedAt) || new Date().toISOString(),
  }
}

function normalizeQuote(raw: unknown, index: number, vehicleIds: Set<string>, warnings: string[]): PriceQuote | null {
  if (!isRecord(raw)) {
    warnings.push(`第 ${index + 1} 条报价不是对象，已跳过`)
    return null
  }
  const vehicleId = str(raw.vehicleId)
  if (!vehicleIds.has(vehicleId)) {
    warnings.push(`第 ${index + 1} 条报价引用了不存在的车型（${vehicleId || '空'}），已跳过`)
    return null
  }
  const base = blankQuote(vehicleId)
  return {
    ...base,
    id: str(raw.id) || uid('quote'),
    vehicleId,
    date: str(raw.date) || todayISO(),
    label: str(raw.label) || '导入报价',
    guidePrice: numOrNull(raw.guidePrice),
    officialPrice: numOrNull(raw.officialPrice),
    dealerPrice: numOrNull(raw.dealerPrice),
    limitedDiscount: numOrNull(raw.limitedDiscount),
    cashDiscount: numOrNull(raw.cashDiscount),
    conditionalDiscount: numOrNull(raw.conditionalDiscount),
    tradeInSubsidy: numOrNull(raw.tradeInSubsidy),
    optionTotal: numOrNull(raw.optionTotal),
    adasPack: numOrNull(raw.adasPack),
    insurance: numOrNull(raw.insurance),
    plateFee: numOrNull(raw.plateFee),
    otherFee: numOrNull(raw.otherFee),
    taxOverride: numOrNull(raw.taxOverride),
    includeConditional: raw.includeConditional === true,
    includeTradeIn: raw.includeTradeIn === true,
    status: oneOf(raw.status, VERIFICATION_LEVELS, '待核实'),
    sourceUrl: str(raw.sourceUrl),
    sourceLabel: str(raw.sourceLabel),
    conditions: str(raw.conditions),
    note: str(raw.note),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  }
}

function normalizeSales(
  raw: unknown,
  index: number,
  vehicleIds: Set<string>,
  warnings: string[],
): SalesRecord | null {
  if (!isRecord(raw)) {
    warnings.push(`第 ${index + 1} 条销量记录不是对象，已跳过`)
    return null
  }
  const vehicleId = str(raw.vehicleId)
  if (!vehicleIds.has(vehicleId)) {
    warnings.push(`第 ${index + 1} 条销量记录引用了不存在的车型（${vehicleId || '空'}），已跳过`)
    return null
  }
  const month = normalizeMonth(str(raw.month))
  if (!month) {
    warnings.push(`第 ${index + 1} 条销量记录的月份不是 YYYY-MM（${str(raw.month) || '空'}），已跳过`)
    return null
  }
  return {
    id: str(raw.id) || uid('sale'),
    vehicleId,
    month,
    units: numOrNull(raw.units),
    scope: oneOf(raw.scope, SALES_SCOPES, '待核实'),
    status: oneOf(raw.status, VERIFICATION_LEVELS, '待核实'),
    sourceUrl: str(raw.sourceUrl),
    sourceLabel: str(raw.sourceLabel),
    note: str(raw.note),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  }
}

/** 同一车型同一月份只保留一条（后写入的覆盖先写入的） */
function dedupeSales(records: SalesRecord[]): SalesRecord[] {
  const byKey = new Map<string, SalesRecord>()
  for (const record of records) byKey.set(`${record.vehicleId}|${record.month}`, record)
  return Array.from(byKey.values()).sort(
    (a, b) => a.vehicleId.localeCompare(b.vehicleId) || a.month.localeCompare(b.month),
  )
}

function normalizeReviews(
  raw: unknown,
  index: number,
  vehicleIds: Set<string>,
  warnings: string[],
): ReviewRecord | null {
  if (!isRecord(raw)) {
    warnings.push(`第 ${index + 1} 条车评不是对象，已跳过`)
    return null
  }
  const vehicleId = str(raw.vehicleId)
  if (!vehicleIds.has(vehicleId)) {
    warnings.push(`第 ${index + 1} 条车评引用了不存在的车型（${vehicleId || '空'}），已跳过`)
    return null
  }
  return {
    id: str(raw.id) || uid('rev'),
    vehicleId,
    channel: oneOf(raw.channel, REVIEW_CHANNELS, '超哥超车'),
    title: str(raw.title) || '未命名车评',
    url: str(raw.url),
    publishedAt: str(raw.publishedAt) || todayISO(),
    stance: oneOf(raw.stance, REVIEW_STANCES, '未表态'),
    summary: str(raw.summary),
    points: stringArray(raw.points),
    quotes: stringArray(raw.quotes),
    note: str(raw.note),
    status: oneOf(raw.status, VERIFICATION_LEVELS, '媒体'),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  }
}

function normalizeSettings(value: unknown): AppSettings {
  const d = defaultSettings()
  if (!isRecord(value)) return d
  const hard = isRecord(value.hardFilters) ? value.hardFilters : {}
  const cost = isRecord(value.cost) ? value.cost : {}
  const budgetMin = numOrNull(value.budgetMin)
  let budgetMax = numOrNull(value.budgetMax)
  if (budgetMin !== null && budgetMax !== null && budgetMax <= budgetMin) {
    budgetMax = budgetMin + 10000
  }
  return {
    ownerName: str(value.ownerName, d.ownerName) || d.ownerName,
    budgetMin: budgetMin !== null && budgetMin > 0 ? budgetMin : d.budgetMin,
    budgetMax: budgetMax !== null && budgetMax > 0 ? budgetMax : d.budgetMax,
    targetPurchaseDate: str(value.targetPurchaseDate) || d.targetPurchaseDate,
    purchaseCity: str(value.purchaseCity, d.purchaseCity) || d.purchaseCity,
    taxPolicy: oneOf(value.taxPolicy, TAX_POLICY_MODES, 'auto'),
    defaultInsurance: numOrNull(value.defaultInsurance) ?? d.defaultInsurance,
    defaultPlateFee: numOrNull(value.defaultPlateFee) ?? d.defaultPlateFee,
    staleDays: clamp(numOrNull(value.staleDays) ?? d.staleDays, 7, 365),
    hardFilters: {
      maxLanding: numOrNull(hard.maxLanding),
      minRange: numOrNull(hard.minRange),
      requireCityNoa: hard.requireCityNoa === true,
      requireLidar: hard.requireLidar === true,
      keyOnly: hard.keyOnly === true,
    },
    cost: {
      years: clamp(numOrNull(cost.years) ?? d.cost.years, 1, 15),
      annualKm: clamp(numOrNull(cost.annualKm) ?? d.cost.annualKm, 1000, 60000),
      homeChargeRatio: clamp(numOrNull(cost.homeChargeRatio) ?? d.cost.homeChargeRatio, 0, 1),
      homePrice: clamp(numOrNull(cost.homePrice) ?? d.cost.homePrice, 0, 5),
      publicPrice: clamp(numOrNull(cost.publicPrice) ?? d.cost.publicPrice, 0, 10),
      defaultConsumption: clamp(numOrNull(cost.defaultConsumption) ?? d.cost.defaultConsumption, 5, 40),
      insuranceAnnual: clamp(numOrNull(cost.insuranceAnnual) ?? d.cost.insuranceAnnual, 0, 50000),
      maintenanceAnnual: clamp(numOrNull(cost.maintenanceAnnual) ?? d.cost.maintenanceAnnual, 0, 50000),
      tiresAnnual: clamp(numOrNull(cost.tiresAnnual) ?? d.cost.tiresAnnual, 0, 50000),
      repairAnnual: clamp(numOrNull(cost.repairAnnual) ?? d.cost.repairAnnual, 0, 50000),
      residualRate: clamp(numOrNull(cost.residualRate) ?? d.cost.residualRate, 0, 100),
      opportunityRate: clamp(numOrNull(cost.opportunityRate) ?? d.cost.opportunityRate, 0, 20),
    },
  }
}

function normalizeSnapshot(raw: unknown, vehicleIds: Set<string>): RankSnapshot | null {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return null
  const entries = raw.entries
    .filter(isRecord)
    .map((entry) => ({
      vehicleId: str(entry.vehicleId),
      score: numOrNull(entry.score),
      rank: Math.max(1, Math.round(numOrNull(entry.rank) ?? 999)),
      coverage: clamp(numOrNull(entry.coverage) ?? 0, 0, 1),
      passesFilters: typeof entry.passesFilters === 'boolean' ? entry.passesFilters : null,
    }))
    .filter((entry) => vehicleIds.has(entry.vehicleId))
  if (entries.length === 0) return null
  return {
    id: str(raw.id) || uid('snap'),
    at: str(raw.at) || new Date().toISOString(),
    mode: raw.mode === 'auto' ? 'auto' : 'manual',
    entries,
  }
}

function normalizeScoring(value: unknown, vehicleIds: Set<string>): ScoringState {
  const d = defaultScoring()
  if (!isRecord(value)) return d
  const weights = { ...d.weights }
  if (isRecord(value.weights)) {
    for (const id of SCORE_DIM_IDS) {
      const n = numOrNull(value.weights[id])
      if (n !== null) weights[id] = clamp(n, 0, 100)
    }
  }
  return {
    // 自动评分模式已下线（排序只认个人手动分），老数据一律归到 manual
    mode: 'manual',
    weights,
    snapshots: Array.isArray(value.snapshots)
      ? value.snapshots
          .map((s) => normalizeSnapshot(s, vehicleIds))
          .filter((s): s is RankSnapshot => s !== null)
          .slice(-40)
      : [],
  }
}

export interface ValidationResult {
  ok: boolean
  data?: AppData
  errors: string[]
  warnings: string[]
}

export function validateAndNormalize(raw: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isRecord(raw)) return { ok: false, errors: ['文件根节点必须是 JSON 对象。'], warnings }

  const rawVehicles = raw.vehicles
  if (!Array.isArray(rawVehicles)) return { ok: false, errors: ['缺少 vehicles 数组。'], warnings }
  if (rawVehicles.length > 200) return { ok: false, errors: ['车型数量超过 200，疑似不是本应用的备份文件。'], warnings }

  const vehicles = rawVehicles
    .map((v, index) => normalizeVehicle(v, index, warnings))
    .filter((v): v is Vehicle => v !== null)
  const ids = new Set(vehicles.map((v) => v.id))
  if (ids.size !== vehicles.length) {
    errors.push('存在重复的车型 ID，已中止导入。')
  }

  const rawQuotes = Array.isArray(raw.quotes) ? raw.quotes : []
  const quotes = rawQuotes
    .map((q, index) => normalizeQuote(q, index, ids, warnings))
    .filter((q): q is PriceQuote => q !== null)

  const settings = normalizeSettings(raw.settings)
  const scoring = normalizeScoring(raw.scoring, ids)
  const rawSales = Array.isArray(raw.sales) ? raw.sales : []
  const sales = dedupeSales(
    rawSales
      .map((s, index) => normalizeSales(s, index, ids, warnings))
      .filter((s): s is SalesRecord => s !== null),
  )
  const rawReviews = Array.isArray(raw.reviews) ? raw.reviews : []
  const reviews = rawReviews
    .map((r, index) => normalizeReviews(r, index, ids, warnings))
    .filter((r): r is ReviewRecord => r !== null)
  const compareIds = Array.isArray(raw.compareIds)
    ? raw.compareIds.filter((id): id is string => typeof id === 'string' && ids.has(id))
    : []

  if (vehicles.length === 0 && warnings.length === 0) warnings.push('文件中没有车型数据。')
  if (errors.length > 0) return { ok: false, errors, warnings }

  return {
    ok: true,
    errors: [],
    warnings,
    data: {
      version: numOrNull(raw.version) ?? APP_VERSION,
      vehicles,
      quotes,
      sales,
      reviews,
      settings,
      scoring,
      compareIds,
    },
  }
}

export function parseImport(text: string): ValidationResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['文件不是合法 JSON，请检查是否选择了本应用导出的 .json 文件。'], warnings: [] }
  }
  return validateAndNormalize(raw)
}

/**
 * 老数据没有封面图时，用示例数据里的官方图补齐（只补图片字段，不动用户数据）。
 * 换了封面或删过封面的车型不处理，避免覆盖用户自己的选择。
 */
function fillSeedCovers(data: AppData): AppData {
  const seedCovers = new Map(
    seedData()
      .vehicles.filter((vehicle) => vehicle.coverImage)
      .map((vehicle) => [
        vehicle.id,
        { coverImage: vehicle.coverImage, coverWide: vehicle.coverWide, imageCredit: vehicle.imageCredit },
      ]),
  )
  let changed = false
  const vehicles = data.vehicles.map((vehicle) => {
    if (vehicle.coverImage) return vehicle
    const cover = seedCovers.get(vehicle.id)
    if (!cover) return vehicle
    changed = true
    return { ...vehicle, coverImage: cover.coverImage, coverWide: cover.coverWide, imageCredit: cover.imageCredit }
  })
  return changed ? { ...data, vehicles } : data
}

/**
 * 老数据里 Q06 的手动分还是初始占位值（8.3/8.6/7.9/8.9/8.8/8.4/7.5）时，
 * 一次性换成新口径（后排/续航/智驾上调）；用户自己改过的分数一律不动。
 */
const LEGACY_Q06_SCORES: Record<string, number> = {
  price: 8.3,
  adas: 8.6,
  chassis: 7.9,
  range: 8.9,
  space: 8.8,
  cockpit: 8.4,
  brand: 7.5,
}

function migrateSeedScores(data: AppData): AppData {
  const seed = seedData()
  let changed = false
  const vehicles = data.vehicles.map((vehicle) => {
    if (vehicle.id !== 'v_q06') return vehicle
    const untouched = Object.entries(LEGACY_Q06_SCORES).every(
      ([dim, value]) => vehicle.manualScores[dim as keyof typeof vehicle.manualScores] === value,
    )
    if (!untouched) return vehicle
    const next = seed.vehicles.find((item) => item.id === 'v_q06')
    if (!next) return vehicle
    changed = true
    return { ...vehicle, manualScores: { ...next.manualScores } }
  })
  return changed ? { ...data, vehicles } : data
}

export interface LoadResult {
  data: AppData
  source: 'storage' | 'seed' | 'recovered'
  warning?: string
}

export function loadData(): LoadResult {
  if (typeof localStorage === 'undefined') {
    return { data: seedData(), source: 'seed' }
  }
  let text: string | null = null
  try {
    text = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: seedData(), source: 'seed', warning: '浏览器禁用了本地存储，本次修改无法自动保存。' }
  }
  if (!text) return { data: seedData(), source: 'seed' }

  try {
    const parsed = parseImport(text)
    if (!parsed.ok || !parsed.data) {
      try {
        localStorage.setItem(`${CORRUPT_KEY_PREFIX}${Date.now()}`, text.slice(0, 200000))
      } catch {
        // 备份失败不阻塞启动
      }
      return {
        data: seedData(),
        source: 'recovered',
        warning: `本地数据校验失败，已加载初始数据。原数据已尝试备份。${parsed.errors[0] ?? ''}`,
      }
    }
    return { data: migrateSeedScores(fillSeedCovers(parsed.data)), source: 'storage' }
  } catch {
    return { data: seedData(), source: 'recovered', warning: '读取本地数据失败，已加载初始数据。' }
  }
}

export function saveData(data: AppData): { ok: boolean; error?: string; bytes: number } {
  const text = JSON.stringify(data)
  const bytes = new Blob([text]).size
  if (typeof localStorage === 'undefined') return { ok: false, error: '当前环境不支持 LocalStorage', bytes }
  try {
    localStorage.setItem(STORAGE_KEY, text)
    return { ok: true, bytes }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error && error.name === 'QuotaExceededError'
        ? '本地存储空间不足，请压缩封面图或清理旧数据后重试。'
        : '写入本地存储失败。',
      bytes,
    }
  }
}

export function serializeData(data: AppData): string {
  return JSON.stringify(
    {
      ...data,
      meta: {
        app: 'CARFLEET',
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
      },
    },
    null,
    2,
  )
}

export function mergeData(current: AppData, incoming: AppData): AppData {
  const byId = new Map(current.vehicles.map((v) => [v.id, v]))
  for (const vehicle of incoming.vehicles) byId.set(vehicle.id, vehicle)
  const vehicles = Array.from(byId.values())
  const validIds = new Set(vehicles.map((v) => v.id))
  const quoteById = new Map(current.quotes.filter((q) => validIds.has(q.vehicleId)).map((q) => [q.id, q]))
  for (const quote of incoming.quotes) if (validIds.has(quote.vehicleId)) quoteById.set(quote.id, quote)
  const salesByKey = new Map(
    current.sales.filter((s) => validIds.has(s.vehicleId)).map((s) => [`${s.vehicleId}|${s.month}`, s]),
  )
  for (const record of incoming.sales) {
    if (validIds.has(record.vehicleId)) salesByKey.set(`${record.vehicleId}|${record.month}`, record)
  }
  const reviewById = new Map(
    current.reviews.filter((r) => validIds.has(r.vehicleId)).map((r) => [r.id, r]),
  )
  for (const review of incoming.reviews) if (validIds.has(review.vehicleId)) reviewById.set(review.id, review)
  return {
    version: APP_VERSION,
    vehicles,
    quotes: Array.from(quoteById.values()),
    sales: dedupeSales(Array.from(salesByKey.values())),
    reviews: Array.from(reviewById.values()),
    settings: incoming.settings,
    scoring: incoming.scoring,
    compareIds: Array.from(new Set([...current.compareIds, ...incoming.compareIds])).filter((id) => validIds.has(id)),
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function storageUsage(): number {
  try {
    return new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size
  } catch {
    return 0
  }
}
