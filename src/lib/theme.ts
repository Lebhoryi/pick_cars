export interface ThemeMeta {
  id: ThemeId
  name: string
  tone: '深色' | '浅色'
  desc: string
  accent: string
  surface: string
}

export type ThemeId = 'deep' | 'graphite' | 'midnight' | 'ivory' | 'cloud' | 'sand'

export const THEME_KEY = 'carfleet.theme'

export const THEMES: ThemeMeta[] = [
  { id: 'deep', name: '深海', tone: '深色', desc: '青绿 · 默认', accent: '#5eead4', surface: '#0b111a' },
  { id: 'graphite', name: '石墨', tone: '深色', desc: '琥珀 · 中性黑', accent: '#fbbf24', surface: '#18191d' },
  { id: 'midnight', name: '午夜蓝', tone: '深色', desc: '天蓝 · 藏青', accent: '#7dd3fc', surface: '#0a1730' },
  { id: 'ivory', name: '象牙', tone: '浅色', desc: '暖白 · 青绿', accent: '#0f766e', surface: '#fffdf8' },
  { id: 'cloud', name: '云雾', tone: '浅色', desc: '冷白 · 灰蓝', accent: '#0e7490', surface: '#ffffff' },
  { id: 'sand', name: '沙丘', tone: '浅色', desc: '米棕 · 陶土', accent: '#b45309', surface: '#fffaf3' },
]

const THEME_IDS = THEMES.map((theme) => theme.id)

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as string[]).includes(value)
}

export function loadTheme(): ThemeId {
  if (typeof window === 'undefined') return 'deep'
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    if (isThemeId(saved)) return saved
  } catch {
    // 浏览器禁用本地存储时用默认主题
  }
  return 'deep'
}

export function applyTheme(id: ThemeId): void {
  if (typeof document === 'undefined') return
  const theme = THEMES.find((item) => item.id === id) ?? THEMES[0]
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.dataset.tone = theme.tone === '浅色' ? 'light' : 'dark'
  root.style.colorScheme = theme.tone === '浅色' ? 'light' : 'dark'
}

export function saveTheme(id: ThemeId): void {
  try {
    window.localStorage.setItem(THEME_KEY, id)
  } catch {
    // 忽略写入失败
  }
}
