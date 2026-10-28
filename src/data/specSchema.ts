import type { Vehicle, VehicleSpecs } from '@/types'

export type SpecFieldType = 'number' | 'text' | 'textarea' | 'boolean' | 'select'
export type PreferRule = 'higher' | 'lower' | 'yes' | 'no' | 'none'

export interface SpecField {
  key: string
  label: string
  type: SpecFieldType
  unit?: string
  options?: string[]
  placeholder?: string
  hint?: string
  step?: number
  prefer?: PreferRule
  /** 参与「无差异隐藏」时使用的比较精度 */
  precision?: number
}

export interface SpecGroup {
  id: keyof VehicleSpecs
  label: string
  short: string
  description: string
  fields: SpecField[]
}

const YES_NO = ['有', '无']
const NOA = ['标配', '选装', '无', '待核实']
export const HARDWARE_OPTIONS = ['标配', '选装（需付费）', '无', '待核实']

export const SPEC_GROUPS: SpecGroup[] = [
  {
    id: 'basic',
    label: '基础信息',
    short: '车款',
    description: '年款、在售状态、质保与服务网络等基础口径。',
    fields: [
      { key: 'launchDate', label: '上市时间', type: 'text', placeholder: '2026-09 或 待核实' },
      { key: 'saleStatus', label: '在售状态', type: 'select', options: ['在售', '预售', '即将上市', '停售', '待核实'] },
      { key: 'seats', label: '座位数', type: 'number', unit: '座', prefer: 'higher' },
      { key: 'platform', label: '平台 / 架构', type: 'text', placeholder: '如 e平台3.0 Evo' },
      { key: 'warranty', label: '整车与三电质保', type: 'textarea', placeholder: '如：整车 6 年/15 万公里，三电首任车主终身' },
      { key: 'serviceNetwork', label: '服务网络 / 补能', type: 'textarea', placeholder: '门店覆盖、家充桩权益、换电等' },
      { key: 'residualRate', label: '预计 5 年残值率', type: 'number', unit: '%', prefer: 'higher', hint: '个人估算，用于保值率维度与持有成本，不是官方数据。' },
    ],
  },
  {
    id: 'powertrain',
    label: '三电与续航',
    short: '三电',
    description: '电池、电机、续航、补能与能耗。宣传续航均为 CLTC 口径。',
    fields: [
      { key: 'batteryKwh', label: '电池容量', type: 'number', unit: 'kWh', step: 0.1, prefer: 'higher' },
      { key: 'batteryBrand', label: '电池品牌', type: 'text' },
      { key: 'batteryType', label: '电池类型', type: 'select', options: ['磷酸铁锂', '三元锂', '钠离子', '其他', '待核实'] },
      { key: 'cltcRange', label: 'CLTC 续航', type: 'number', unit: 'km', prefer: 'higher' },
      { key: 'motorCount', label: '电机数量', type: 'number', unit: '个', prefer: 'higher' },
      { key: 'powerKw', label: '电机总功率', type: 'number', unit: 'kW', prefer: 'higher' },
      { key: 'torqueNm', label: '峰值扭矩', type: 'number', unit: 'N·m', prefer: 'higher' },
      { key: 'accel0100', label: '0–100 km/h', type: 'number', unit: 's', step: 0.1, prefer: 'lower' },
      { key: 'topSpeed', label: '最高车速', type: 'number', unit: 'km/h', prefer: 'higher' },
      { key: 'highVoltage', label: '高压平台', type: 'select', options: ['800V', '400V', '其他', '待核实'] },
      { key: 'peakChargeKw', label: '峰值充电功率', type: 'number', unit: 'kW', prefer: 'higher' },
      { key: 'fastChargeTimeMin', label: '快充时间', type: 'number', unit: 'min', step: 0.1, prefer: 'lower', hint: '请同时填写充电区间，跨车型比较时必须统一区间。' },
      { key: 'fastChargeSoc', label: '快充区间', type: 'text', placeholder: '如 30–80% 或 10–80%' },
      { key: 'consumption', label: '百公里电耗', type: 'number', unit: 'kWh/100km', step: 0.1, prefer: 'lower' },
      { key: 'batteryPreheat', label: '电池预热', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'thermalMgmt', label: '热管理能力', type: 'text', placeholder: '热泵、宽温域、低温充电策略等' },
      { key: 'realRangeSummer', label: '实测续航（常温）', type: 'number', unit: 'km', prefer: 'higher', hint: '第三方实测或个人记录，需注明来源。' },
      { key: 'realRangeWinter', label: '实测续航（冬季）', type: 'number', unit: 'km', prefer: 'higher' },
      { key: 'v2lKw', label: '对外放电功率', type: 'number', unit: 'kW', step: 0.1, prefer: 'higher' },
    ],
  },
  {
    id: 'body',
    label: '车身与空间',
    short: '空间',
    description: '尺寸、轴距、储物与后排空间。腿部/头部空间优先使用实测值。',
    fields: [
      { key: 'length', label: '车长', type: 'number', unit: 'mm', prefer: 'higher' },
      { key: 'width', label: '车宽', type: 'number', unit: 'mm', prefer: 'higher' },
      { key: 'height', label: '车高', type: 'number', unit: 'mm', prefer: 'higher' },
      { key: 'wheelbase', label: '轴距', type: 'number', unit: 'mm', prefer: 'higher' },
      { key: 'curbWeight', label: '整备质量', type: 'number', unit: 'kg', prefer: 'lower' },
      { key: 'trunkL', label: '后备厢常规容积', type: 'number', unit: 'L', prefer: 'higher' },
      { key: 'trunkMaxL', label: '后备厢最大拓展', type: 'number', unit: 'L', prefer: 'higher' },
      { key: 'frunkL', label: '前备厢容积', type: 'number', unit: 'L', prefer: 'higher' },
      { key: 'rearLegroom', label: '后排腿部空间', type: 'number', unit: 'mm', prefer: 'higher' },
      { key: 'rearHeadroom', label: '后排头部空间', type: 'number', unit: 'mm', prefer: 'higher' },
      { key: 'rearWidth', label: '后排横向宽度', type: 'number', unit: 'mm', prefer: 'higher' },
      { key: 'seatFold', label: '后排座椅放倒', type: 'text', placeholder: '如 4:6 比例放倒，接近纯平' },
    ],
  },
  {
    id: 'chassis',
    label: '底盘与驾乘',
    short: '底盘',
    description: '悬架形式、可变阻尼/空悬、轮胎制动与调校评价。',
    fields: [
      { key: 'frontSusp', label: '前悬架', type: 'text', placeholder: '如 双叉臂 / 麦弗逊' },
      { key: 'rearSusp', label: '后悬架', type: 'text', placeholder: '如 五连杆 / 多连杆' },
      { key: 'suspMaterial', label: '悬架材质 / 关键硬件', type: 'text', placeholder: '全铝、液压衬套、双球头等' },
      { key: 'damping', label: '可变阻尼', type: 'text', placeholder: 'CDC / FSD / 无' },
      { key: 'airSusp', label: '空气悬架', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'roadPreview', label: '路面预瞄', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'tire', label: '轮胎规格', type: 'text', placeholder: '235/50 R19' },
      { key: 'brake', label: '制动系统', type: 'text', placeholder: '前通风盘 / 后通风盘 / 四活塞卡钳' },
      { key: 'turningRadius', label: '最小转弯半径', type: 'number', unit: 'm', step: 0.01, prefer: 'lower' },
      { key: 'rigidity', label: '车身扭转刚度', type: 'number', unit: 'N·m/deg', prefer: 'higher' },
      { key: 'tuning', label: '底盘调校评价', type: 'textarea', placeholder: '试驾感受、媒体评价、侧倾/滤震/转向手感' },
    ],
  },
  {
    id: 'comfort',
    label: '舒适与座舱',
    short: '舒适',
    description: '座椅、音响、隔音、车机与舒适性配置。',
    fields: [
      { key: 'seatMaterial', label: '座椅材质', type: 'text' },
      { key: 'driverAdjust', label: '主驾电动调节', type: 'text', placeholder: '如 12 向 + 4 向腰托' },
      { key: 'passengerAdjust', label: '副驾电动调节', type: 'text' },
      { key: 'seatMemory', label: '座椅记忆', type: 'text' },
      { key: 'seatHeat', label: '座椅加热', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'seatVent', label: '座椅通风', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'seatMassage', label: '座椅按摩', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'rearComfort', label: '后排舒适配置', type: 'textarea', placeholder: '加热/通风/按摩、靠背角度、小桌板等' },
      { key: 'audioBrand', label: '音响品牌', type: 'text' },
      { key: 'speakers', label: '扬声器数量', type: 'number', unit: '个', prefer: 'higher' },
      { key: 'acousticGlass', label: '隔音玻璃', type: 'text', placeholder: '前排双层夹胶 / 全车双层等' },
      { key: 'climate', label: '空调', type: 'text', placeholder: '热泵、双温区、PM2.5、香氛' },
      { key: 'rearVent', label: '后排出风口', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'fridge', label: '车载冰箱', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'rearScreen', label: '后排娱乐屏', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'sunshade', label: '电动遮阳帘', type: 'boolean', options: YES_NO, prefer: 'yes' },
      { key: 'chip', label: '车机芯片', type: 'text', placeholder: '如 高通 8295 / 龍鹰一号' },
      { key: 'screen', label: '屏幕与 HUD', type: 'text', placeholder: '15.6" 2K 中控 + 26" HUD' },
      { key: 'hud', label: 'HUD 规格', type: 'text' },
      { key: 'os', label: '车机系统', type: 'text' },
      { key: 'phoneLink', label: '手机互联', type: 'text' },
      { key: 'ota', label: 'OTA 能力', type: 'text' },
    ],
  },
  {
    id: 'adas',
    label: '智能驾驶',
    short: '智驾',
    description: '方案、芯片算力、传感器、功能范围与付费方式。选装硬件必须与基础车型区分。',
    fields: [
      { key: 'solution', label: '智驾方案', type: 'text', placeholder: '如 华为乾崑 ADS 5 Pro' },
      { key: 'supplier', label: '方案供应商', type: 'text', placeholder: '华为 / 地平线 / 自研' },
      { key: 'chip', label: '智驾芯片', type: 'text' },
      { key: 'tops', label: '算力', type: 'number', unit: 'TOPS', prefer: 'higher' },
      { key: 'lidar', label: '激光雷达数量', type: 'number', unit: '颗', prefer: 'higher' },
      { key: 'lidarSpec', label: '激光雷达规格', type: 'text', placeholder: '如 256 线 / 舱内激光' },
      { key: 'cameras', label: '摄像头数量', type: 'number', unit: '个', prefer: 'higher' },
      { key: 'radars', label: '毫米波雷达数量', type: 'number', unit: '个', prefer: 'higher' },
      { key: 'ultrasonic', label: '超声波雷达数量', type: 'number', unit: '个', prefer: 'higher' },
      { key: 'highSpeedNoa', label: '高速 NOA', type: 'select', options: NOA, prefer: 'yes' },
      { key: 'cityNoa', label: '城市 NOA', type: 'select', options: NOA, prefer: 'yes' },
      { key: 'autoPark', label: '自动泊车', type: 'select', options: NOA, prefer: 'yes' },
      { key: 'coverage', label: '领航适用范围', type: 'text', placeholder: '城市数量、道路类型、是否需开通' },
      { key: 'hardware', label: '智驾硬件标配/选装', type: 'select', options: HARDWARE_OPTIONS },
      { key: 'softwareFee', label: '软件/功能费用', type: 'text', placeholder: '如 免费开通 / 1.5 万元买断' },
      { key: 'subscription', label: '订阅与开通条件', type: 'text' },
      { key: 'upgrade', label: '后续升级政策', type: 'text' },
      { key: 'experience', label: '实际体验与限制', type: 'textarea', placeholder: '试驾/媒体实测感受，接管频率、可用路段、短板' },
    ],
  },
  {
    id: 'safety',
    label: '安全配置',
    short: '安全',
    description: '被动安全、主动安全与电池安全。',
    fields: [
      { key: 'airbags', label: '安全气囊数量', type: 'number', unit: '个', prefer: 'higher' },
      { key: 'aeb', label: 'AEB / 主动安全', type: 'text', placeholder: '如 CAS 5.0，最高 130km/h 刹停' },
      { key: 'structure', label: '车身结构', type: 'text', placeholder: '高强钢占比、热成型门环、扭转刚度' },
      { key: 'batterySafety', label: '电池安全', type: 'text', placeholder: 'CTB、刀片电池、NP 技术等' },
      { key: 'note', label: '安全备注', type: 'textarea' },
    ],
  },
]

export const SPEC_GROUP_MAP = Object.fromEntries(SPEC_GROUPS.map((g) => [g.id, g])) as Record<
  keyof VehicleSpecs,
  SpecGroup
>

export const ALL_SPEC_FIELDS: Array<{ path: string; group: SpecGroup; field: SpecField }> = SPEC_GROUPS.flatMap(
  (group) => group.fields.map((field) => ({ path: `${group.id}.${field.key}`, group, field })),
)

export function getSpecValue(vehicle: Vehicle, path: string): unknown {
  const [group, key] = path.split('.')
  const g = (vehicle.specs as unknown as Record<string, Record<string, unknown>>)[group]
  return g ? g[key] : undefined
}

export function setSpecValue(specs: VehicleSpecs, path: string, value: unknown): void {
  const [group, key] = path.split('.')
  const g = (specs as unknown as Record<string, Record<string, unknown>>)[group]
  if (g) g[key] = value
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === '' || value.trim() === '待核实'
  return false
}

export function formatSpecValue(field: SpecField, value: unknown): string {
  if (value === null || value === undefined || value === '') return '待核实'
  if (typeof value === 'boolean') return value ? '有' : '无'
  if (field.type === 'number' && typeof value === 'number') {
    const decimals = field.step && field.step < 1 ? (field.step < 0.05 ? 2 : 1) : 0
    return `${value.toLocaleString('zh-CN', { maximumFractionDigits: decimals })}${field.unit ? ` ${field.unit}` : ''}`
  }
  if (typeof value === 'string' && value === '待核实') return '待核实'
  return `${value}${field.unit ? ` ${field.unit}` : ''}`
}
