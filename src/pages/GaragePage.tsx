import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CarFront, LayoutGrid, Plus, Search, SlidersHorizontal, Table2, X } from 'lucide-react'
import type { Vehicle } from '@/types'
import { FOCUS_STATUSES } from '@/types'
import { useApp } from '@/store/AppStore'
import { cn } from '@/lib/format'
import { Badge, Button, EmptyState, PageHeader } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/Field'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { VehicleTable } from '@/components/vehicle/VehicleTable'
import { VehicleFormModal } from '@/components/vehicle/VehicleFormModal'

type ViewMode = 'cards' | 'table'
type SortKey = 'score' | 'price' | 'range' | 'updated' | 'followed'

export function GaragePage() {
  const { data, priceMap, scoresResult } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('全部')
  const [bodyType, setBodyType] = useState('全部')
  const [onlyKey, setOnlyKey] = useState(false)
  const [view, setView] = useState<ViewMode>('cards')
  const [sort, setSort] = useState<SortKey>('score')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null)
      setFormOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const bodyTypes = useMemo(
    () => ['全部', ...Array.from(new Set(data.vehicles.map((v) => v.bodyType)))],
    [data.vehicles],
  )

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    return data.vehicles
      .filter((vehicle) => {
        if (status !== '全部' && vehicle.focusStatus !== status) return false
        if (bodyType !== '全部' && vehicle.bodyType !== bodyType) return false
        if (onlyKey && !vehicle.keyCandidate) return false
        if (!text) return true
        return [vehicle.brand, vehicle.model, vehicle.year, vehicle.trim, vehicle.reason, vehicle.notes, ...vehicle.tags]
          .join(' ')
          .toLowerCase()
          .includes(text)
      })
      .sort((a, b) => {
        if (sort === 'score') return (scoresResult.scores[b.id]?.total ?? -1) - (scoresResult.scores[a.id]?.total ?? -1)
        if (sort === 'price') return (priceMap[a.id]?.breakdown.landing ?? Infinity) - (priceMap[b.id]?.breakdown.landing ?? Infinity)
        if (sort === 'range') return (b.specs.powertrain.cltcRange ?? -1) - (a.specs.powertrain.cltcRange ?? -1)
        if (sort === 'followed') return b.followedAt.localeCompare(a.followedAt)
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [data.vehicles, query, status, bodyType, onlyKey, sort, scoresResult.scores, priceMap])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const clearFilters = () => {
    setQuery('')
    setStatus('全部')
    setBodyType('全部')
    setOnlyKey(false)
  }

  const activeFilters = (query ? 1 : 0) + (status !== '全部' ? 1 : 0) + (bodyType !== '全部' ? 1 : 0) + (onlyKey ? 1 : 0)

  return (
    <div>
      <PageHeader
        title="车型库"
        subtitle="管理所有关注过的车型。每款车都有独立详情页，参数、价格、笔记与来源都可以持续更新。"
        meta={
          <>
            <Badge tone="teal" dot>
              {data.vehicles.length} 款在库
            </Badge>
            <Badge tone="lime">{data.vehicles.filter((v) => v.keyCandidate).length} 款重点候选</Badge>
            <Badge tone="neutral">{data.vehicles.filter((v) => v.focusStatus === '暂时淘汰').length} 款暂时淘汰</Badge>
          </>
        }
        actions={
          <Button variant="primary" icon={Plus} onClick={openNew}>
            新增车型
          </Button>
        }
      />

      <div className="panel mb-5 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索品牌、车型、版本、标签或笔记…"
              className="field pl-9 pr-9"
              aria-label="搜索车型"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="清空搜索"
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-mist-500 hover:text-mist-200"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-line/70 bg-ink-900/40 p-0.5">
              {['全部', ...FOCUS_STATUSES].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={cn(
                    'h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-medium transition',
                    status === item ? 'bg-ink-700 text-mist-100' : 'text-mist-500 hover:text-mist-200',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <select
              value={bodyType}
              onChange={(event) => setBodyType(event.target.value)}
              className="field h-8 w-auto py-0 text-[11px]"
              aria-label="车型类别"
            >
              {bodyTypes.map((item) => (
                <option key={item} value={item}>
                  {item === '全部' ? '全部类别' : item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOnlyKey((v) => !v)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] transition',
                onlyKey
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-line-strong bg-transparent text-mist-400 hover:text-mist-200',
              )}
            >
              <SlidersHorizontal className="size-3.5" /> 仅重点候选
            </button>
            {activeFilters > 0 ? (
              <button type="button" onClick={clearFilters} className="text-[10.5px] text-mist-500 transition hover:text-mist-200">
                清除筛选 ({activeFilters})
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
          <span className="text-[10.5px] text-mist-500">
            显示 {filtered.length} / {data.vehicles.length} 款
          </span>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="field h-8 w-auto py-0 text-[11px]"
              aria-label="排序方式"
            >
              <option value="score">综合评分</option>
              <option value="price">落地价从低到高</option>
              <option value="range">CLTC 续航</option>
              <option value="followed">关注日期</option>
              <option value="updated">最近更新</option>
            </select>
            <Segmented
              value={view}
              onChange={setView}
              size="sm"
              options={[
                { value: 'cards', label: '卡片', icon: <LayoutGrid className="size-3.5" /> },
                { value: 'table', label: '表格', icon: <Table2 className="size-3.5" /> },
              ]}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        data.vehicles.length === 0 ? (
          <EmptyState
            icon={CarFront}
            title="车库为空"
            description="新增第一款车型，或到数据管理恢复 6 款初始示例数据。"
            action={
              <Button variant="primary" icon={Plus} onClick={openNew}>
                新增车型
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="没有匹配的车型"
            description="试试更短的关键词，或清除关注状态、类别与重点候选筛选。"
            action={
              <Button variant="secondary" onClick={clearFilters}>
                清除筛选
              </Button>
            }
          />
        )
      ) : view === 'cards' ? (
        <div className="card-grid">
          {filtered.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              priceInfo={priceMap[vehicle.id]}
              score={scoresResult.scores[vehicle.id]}
              filter={scoresResult.filters[vehicle.id]}
              onEdit={(v) => {
                setEditing(v)
                setFormOpen(true)
              }}
            />
          ))}
        </div>
      ) : (
        <VehicleTable
          vehicles={filtered}
          priceMap={priceMap}
          scores={scoresResult.scores}
          filters={scoresResult.filters}
          onEdit={(v) => {
            setEditing(v)
            setFormOpen(true)
          }}
        />
      )}

      <VehicleFormModal
        open={formOpen}
        vehicle={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
