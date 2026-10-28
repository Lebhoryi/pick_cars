import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import type { AppData, AppSettings, PriceQuote, ScoringState, Vehicle } from '@/types'
import { seedData } from '@/data/seed'
import { loadData, saveData } from '@/lib/storage'
import { buildPriceMap } from '@/lib/price'
import { computeAllScores } from '@/lib/score'
import { cn } from '@/lib/format'

export type AppAction =
  | { type: 'UPSERT_VEHICLE'; vehicle: Vehicle }
  | { type: 'DELETE_VEHICLE'; id: string }
  | { type: 'ADD_QUOTE'; quote: PriceQuote }
  | { type: 'UPDATE_QUOTE'; quote: PriceQuote }
  | { type: 'DELETE_QUOTE'; id: string }
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'SET_SCORING'; scoring: ScoringState }
  | { type: 'SET_COMPARE_IDS'; ids: string[] }
  | { type: 'TOGGLE_COMPARE'; id: string }
  | { type: 'ADD_SNAPSHOT'; snapshot: ScoringState['snapshots'][number] }
  | { type: 'REPLACE_ALL'; data: AppData }
  | { type: 'RESET_SEED' }
  | { type: 'CLEAR_ALL' }

function reducer(state: AppData, action: AppAction): AppData {
  switch (action.type) {
    case 'UPSERT_VEHICLE': {
      const exists = state.vehicles.some((v) => v.id === action.vehicle.id)
      const vehicle = { ...action.vehicle, updatedAt: new Date().toISOString() }
      return {
        ...state,
        vehicles: exists
          ? state.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v))
          : [...state.vehicles, vehicle],
      }
    }
    case 'DELETE_VEHICLE':
      return {
        ...state,
        vehicles: state.vehicles.filter((v) => v.id !== action.id),
        quotes: state.quotes.filter((q) => q.vehicleId !== action.id),
        compareIds: state.compareIds.filter((id) => id !== action.id),
        scoring: {
          ...state.scoring,
          snapshots: state.scoring.snapshots.map((s) => ({
            ...s,
            entries: s.entries.filter((e) => e.vehicleId !== action.id),
          })),
        },
      }
    case 'ADD_QUOTE':
      return { ...state, quotes: [...state.quotes, action.quote] }
    case 'UPDATE_QUOTE':
      return {
        ...state,
        quotes: state.quotes.map((q) => (q.id === action.quote.id ? action.quote : q)),
      }
    case 'DELETE_QUOTE':
      return { ...state, quotes: state.quotes.filter((q) => q.id !== action.id) }
    case 'SET_SETTINGS':
      return { ...state, settings: action.settings }
    case 'SET_SCORING':
      return { ...state, scoring: { ...action.scoring, snapshots: action.scoring.snapshots.slice(-40) } }
    case 'SET_COMPARE_IDS': {
      const valid = action.ids.filter((id) => state.vehicles.some((v) => v.id === id)).slice(0, 6)
      return { ...state, compareIds: valid }
    }
    case 'TOGGLE_COMPARE': {
      if (!state.vehicles.some((v) => v.id === action.id)) return state
      const exists = state.compareIds.includes(action.id)
      if (exists) return { ...state, compareIds: state.compareIds.filter((id) => id !== action.id) }
      if (state.compareIds.length >= 6) return state
      return { ...state, compareIds: [...state.compareIds, action.id] }
    }
    case 'ADD_SNAPSHOT':
      return {
        ...state,
        scoring: { ...state.scoring, snapshots: [...state.scoring.snapshots, action.snapshot].slice(-40) },
      }
    case 'REPLACE_ALL':
      return action.data
    case 'RESET_SEED':
      return seedData()
    case 'CLEAR_ALL':
      return {
        ...state,
        vehicles: [],
        quotes: [],
        compareIds: [],
        scoring: { ...state.scoring, snapshots: [] },
      }
    default:
      return state
  }
}

export type ToastTone = 'success' | 'info' | 'warning' | 'error'
interface Toast {
  id: string
  message: string
  tone: ToastTone
}

interface AppContextValue {
  data: AppData
  dispatch: Dispatch<AppAction>
  priceMap: ReturnType<typeof buildPriceMap>
  scoresResult: ReturnType<typeof computeAllScores>
  saveStatus: { state: 'saved' | 'saving' | 'error'; at: string | null; error: string | null; bytes: number }
  toast: (message: string, tone?: ToastTone) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const TOAST_ICONS = {
  success: Check,
  info: Info,
  warning: TriangleAlert,
  error: TriangleAlert,
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadData(), [])
  const [data, dispatch] = useReducer(reducer, initial.data)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [saveStatus, setSaveStatus] = useState<AppContextValue['saveStatus']>({
    state: 'saved',
    at: null,
    error: null,
    bytes: 0,
  })
  const toastTimers = useRef<number[]>([])
  const saveTimer = useRef<number | null>(null)
  const latestData = useRef(data)
  latestData.current = data
  const warned = useRef(false)

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setToasts((list) => [...list.slice(-3), { id, message, tone }])
    const timer = window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, 4200)
    toastTimers.current.push(timer)
  }, [])

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (initial.warning) {
      const timer = window.setTimeout(() => toast(initial.warning ?? '', 'warning'), 400)
      return () => window.clearTimeout(timer)
    }
  }, [initial.warning, toast])

  const persist = useCallback(() => {
    const result = saveData(latestData.current)
    if (result.ok) {
      setSaveStatus({ state: 'saved', at: new Date().toISOString(), error: null, bytes: result.bytes })
    } else {
      setSaveStatus({ state: 'error', at: null, error: result.error ?? '保存失败', bytes: result.bytes })
      if (!warned.current) {
        warned.current = true
        toast(result.error ?? '保存失败', 'error')
        window.setTimeout(() => {
          warned.current = false
        }, 10000)
      }
    }
  }, [toast])

  useEffect(() => {
    setSaveStatus((s) => ({ ...s, state: 'saving' }))
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(persist, 320)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [data, persist])

  useEffect(() => {
    const flush = () => persist()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [persist])

  const priceMap = useMemo(
    () => buildPriceMap(data.vehicles, data.quotes, data.settings),
    [data.vehicles, data.quotes, data.settings],
  )
  const scoresResult = useMemo(
    () => computeAllScores(data.vehicles, data.quotes, data.settings, data.scoring),
    [data.vehicles, data.quotes, data.settings, data.scoring],
  )

  const value = useMemo<AppContextValue>(
    () => ({ data, dispatch, priceMap, scoresResult, saveStatus, toast }),
    [data, priceMap, scoresResult, saveStatus, toast],
  )

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
        {toasts.map((item) => {
          const Icon = TOAST_ICONS[item.tone]
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl animate-rise',
                item.tone === 'success' && 'border-teal-400/25 bg-teal-400/10 text-teal-50',
                item.tone === 'info' && 'border-sky-400/25 bg-sky-400/10 text-sky-50',
                item.tone === 'warning' && 'border-amber-400/30 bg-amber-400/10 text-amber-50',
                item.tone === 'error' && 'border-rose-400/30 bg-rose-400/10 text-rose-50',
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1 leading-5">{item.message}</span>
              <button
                type="button"
                aria-label="关闭提示"
                className="text-current/60 transition hover:text-current"
                onClick={() => setToasts((list) => list.filter((t) => t.id !== item.id))}
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}

export function useVehicle(id: string | undefined): Vehicle | null {
  const { data } = useApp()
  if (!id) return null
  return data.vehicles.find((v) => v.id === id) ?? null
}
