import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Calculator,
  CarFront,
  ChevronRight,
  Columns3,
  Database,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  TrendingDown,
  Trophy,
  X,
} from 'lucide-react'
import { cn, formatWan, monthsUntil } from '@/lib/format'
import { useApp } from '@/store/AppStore'
import { Button } from '@/components/ui/primitives'

const NAV = [
  {
    group: '决策',
    items: [
      { to: '/', label: '总览', icon: LayoutDashboard, end: true },
      { to: '/garage', label: '车型库', icon: CarFront },
      { to: '/compare', label: '车型对比', icon: Columns3 },
      { to: '/score', label: '评分模型', icon: Trophy },
    ],
  },
  {
    group: '工具',
    items: [
      { to: '/prices', label: '价格追踪', icon: TrendingDown },
      { to: '/cost', label: '用车成本', icon: Calculator },
      { to: '/data', label: '数据管理', icon: Database },
      { to: '/settings', label: '设置', icon: Settings },
    ],
  },
]

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-xl px-1 py-1">
      <div className="relative flex size-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
        <div className="absolute inset-1 rounded-lg border border-accent/20" />
        <span className="num relative text-[15px] font-bold tracking-tighter text-accent">CF</span>
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold tracking-[0.14em] text-mist-100">CARFLEET</div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-mist-500">Personal Car Desk</div>
      </div>
    </Link>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data, saveStatus } = useApp()
  const months = monthsUntil(data.settings.targetPurchaseDate)
  const keyCount = data.vehicles.filter((v) => v.keyCandidate).length
  const compareCount = data.compareIds.length

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-5 pt-5">
        <BrandMark />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((section) => (
          <div key={section.group} className="mb-5">
            <div className="label mb-2 px-3">{section.group}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium transition',
                      isActive
                        ? 'bg-gradient-to-r from-accent/12 to-transparent text-mist-100'
                        : 'text-mist-400 hover:bg-white/[0.035] hover:text-mist-100',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" /> : null}
                      <item.icon className={cn('size-4', isActive ? 'text-accent' : 'text-mist-500 group-hover:text-mist-300')} />
                      <span className="flex-1">{item.label}</span>
                      {item.to === '/compare' && compareCount > 0 ? (
                        <span className="num rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">
                          {compareCount}
                        </span>
                      ) : null}
                      {item.to === '/score' ? (
                        <span className="num rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-mist-500">
                          {data.scoring.mode === 'manual' ? '手动' : '自动'}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <Link to="/settings" className="mx-1 block rounded-xl border border-line/80 bg-gradient-to-b from-white/[0.03] to-transparent p-3.5 transition hover:border-accent/30">
          <div className="flex items-center justify-between">
            <span className="label">购车计划</span>
            <ChevronRight className="size-3.5 text-mist-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="num text-2xl font-semibold text-mist-100">{months ?? '—'}</span>
            <span className="text-[10px] text-mist-500">个月后</span>
          </div>
          <div className="mt-1 text-[10px] text-mist-500">
            {data.settings.targetPurchaseDate} · 预算 {formatWan(data.settings.budgetMin)}–{formatWan(data.settings.budgetMax)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/[0.025] px-2 py-1.5">
              <div className="text-[9px] text-mist-500">重点候选</div>
              <div className="num text-sm font-semibold text-mist-200">{keyCount}</div>
            </div>
            <div className="rounded-lg bg-white/[0.025] px-2 py-1.5">
              <div className="text-[9px] text-mist-500">在库车型</div>
              <div className="num text-sm font-semibold text-mist-200">{data.vehicles.length}</div>
            </div>
          </div>
        </Link>
      </div>

      <div className="border-t border-line/70 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] text-mist-500">
          <span
            className={cn(
              'size-1.5 rounded-full',
              saveStatus.state === 'error' ? 'bg-danger' : saveStatus.state === 'saving' ? 'bg-warn animate-pulse-soft' : 'bg-positive',
            )}
          />
          {saveStatus.state === 'error' ? '本地保存失败' : saveStatus.state === 'saving' ? '正在保存…' : '已保存到本机'}
          {saveStatus.bytes > 0 ? <span className="ml-auto num">{Math.round(saveStatus.bytes / 1024)} KB</span> : null}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[9.5px] text-mist-500">
          <ShieldCheck className="size-3" /> LocalStorage · 无后端依赖
        </div>
      </div>
    </div>
  )
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data, saveStatus } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const title =
    location.pathname === '/'
      ? '总览'
      : location.pathname.startsWith('/garage/')
        ? '车型详情'
        : NAV.flatMap((s) => s.items).find((item) => location.pathname.startsWith(item.to) && item.to !== '/')?.label ?? '工作台'

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-line/70 bg-ink-900/72 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-ink-900 shadow-2xl animate-fade">
            <div className="absolute right-2 top-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="关闭导航"
                className="flex size-8 items-center justify-center rounded-lg text-mist-400 hover:bg-white/5 hover:text-mist-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 border-b border-line/60 bg-ink-950/72 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="打开导航"
              className="flex size-8 items-center justify-center rounded-lg border border-line text-mist-300 lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-mist-500">
              <span className="hidden sm:inline">CARFLEET</span>
              <ChevronRight className="hidden size-3 sm:inline" />
              <span className="truncate font-medium text-mist-300">{title}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-line/80 bg-white/[0.02] px-2.5 py-1 text-[10px] text-mist-500 sm:inline-flex">
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    saveStatus.state === 'error' ? 'bg-danger' : saveStatus.state === 'saving' ? 'bg-warn' : 'bg-positive',
                  )}
                />
                {saveStatus.state === 'error' ? '保存失败' : saveStatus.state === 'saving' ? '保存中' : '已保存'}
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => navigate('/garage?new=1')}
              >
                <span className="hidden sm:inline">添加车型</span>
                <span className="sm:hidden">添加</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-[1480px] px-4 pb-8 text-[10px] text-mist-600 sm:px-6 lg:px-8">
          数据仅保存在当前浏览器 · 价格为人工记录与估算，不构成购车建议 · 关键参数请以官方配置表与实车为准
          {data.vehicles.length > 0 ? ` · 在库 ${data.vehicles.length} 款` : ''}
        </footer>
      </div>
    </div>
  )
}
