import { useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react'
import type { AppData } from '@/types'
import { useApp } from '@/store/AppStore'
import { cn, formatDate } from '@/lib/format'
import { formatBytes } from '@/lib/image'
import {
  mergeData,
  parseImport,
  serializeData,
  storageUsage,
  type ValidationResult,
} from '@/lib/storage'
import { vehiclesCsv, downloadText } from '@/lib/csv'
import { dataCompleteness } from '@/lib/analytics'
import { Badge, Button, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'

export function DataPage() {
  const { data, priceMap, scoresResult, dispatch, saveStatus, toast } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<(ValidationResult & { fileName: string }) | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  const usage = storageUsage()
  const sourceCount = data.vehicles.reduce((sum, vehicle) => sum + vehicle.sources.length, 0)
  const officialCount = data.vehicles.reduce(
    (sum, vehicle) => sum + Object.values(vehicle.provenance).filter((p) => p.status === '官方').length,
    0,
  )
  const quoteCount = data.quotes.length
  const progress = Math.min(100, (usage / (5 * 1024 * 1024)) * 100)

  const exportJson = () => {
    downloadText(`carfleet-backup-${new Date().toISOString().slice(0, 10)}.json`, serializeData(data), 'application/json')
    toast('完整数据已导出 JSON', 'success')
  }

  const exportCsv = () => {
    const content = vehiclesCsv(data.vehicles, data.quotes, priceMap, scoresResult.scores)
    downloadText(`carfleet-vehicles-${new Date().toISOString().slice(0, 10)}.csv`, content, 'text/csv;charset=utf-8')
    toast('车型数据已导出 CSV', 'success')
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const result = parseImport(text)
      setPending({ ...result, fileName: file.name })
      setImportOpen(true)
    } catch {
      toast('读取文件失败，请重试。', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const applyImport = (mode: 'replace' | 'merge') => {
    if (!pending?.ok || !pending.data) return
    const next: AppData = mode === 'replace' ? pending.data : mergeData(data, pending.data)
    dispatch({ type: 'REPLACE_ALL', data: next })
    setImportOpen(false)
    setPending(null)
    toast(mode === 'replace' ? '已用导入文件替换全部数据' : '已合并导入数据', 'success')
  }

  return (
    <div>
      <PageHeader
        title="数据管理"
        subtitle="所有车型、报价、评分、设置与对比偏好都保存在当前浏览器的 LocalStorage。这里提供全量 JSON 备份、CSV 导出与恢复能力。"
        meta={
          <>
            <Badge tone="teal" dot>
              本地存储
            </Badge>
            <Badge tone="neutral">版本 v{data.version}</Badge>
            <Badge tone={saveStatus.state === 'error' ? 'rose' : 'neutral'}>
              {saveStatus.state === 'error' ? '保存失败' : '自动保存'}
            </Badge>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={exportCsv}>
              导出车型 CSV
            </Button>
            <Button variant="primary" icon={Download} onClick={exportJson}>
              导出完整 JSON
            </Button>
          </>
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '车型', value: data.vehicles.length, sub: '含重点候选 ' + data.vehicles.filter((v) => v.keyCandidate).length, icon: Database },
          { label: '报价记录', value: quoteCount, sub: '跨车型时间点', icon: FileJson },
          { label: '来源链接', value: sourceCount, sub: `官方字段 ${officialCount} 项`, icon: CheckCircle2 },
          { label: '本地占用', value: formatBytes(usage), sub: `约 ${progress.toFixed(0)}% / 5 MB 估算上限`, icon: HardDrive },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="label">{item.label}</span>
              <item.icon className="size-3.5 text-mist-500" />
            </div>
            <div className="num mt-2.5 text-[21px] font-semibold leading-none text-mist-100">{item.value}</div>
            <div className="mt-1.5 text-[10px] text-mist-500">{item.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title="导出备份"
            description="JSON 包含全部车型、报价、评分权重、快照与设置；CSV 仅包含车型主表，适合在 Excel 中查看。"
            action={<Download className="size-4 text-mist-500" />}
          />
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={exportJson}
              className="flex w-full items-start gap-3 rounded-xl border border-line/70 bg-white/[0.012] p-3.5 text-left transition hover:border-accent/35 hover:bg-white/[0.025]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                <FileJson className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-mist-100">完整数据备份（JSON）</div>
                <div className="mt-0.5 text-[10px] leading-4 text-mist-500">
                  包含 {data.vehicles.length} 款车型、{quoteCount} 条报价、权重、快照与全部设置。可用于换设备或恢复。
                </div>
              </div>
              <Download className="mt-0.5 size-4 shrink-0 text-mist-500" />
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="flex w-full items-start gap-3 rounded-xl border border-line/70 bg-white/[0.012] p-3.5 text-left transition hover:border-accent/35 hover:bg-white/[0.025]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 text-sky-300">
                <FileSpreadsheet className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-mist-100">车型主表（CSV）</div>
                <div className="mt-0.5 text-[10px] leading-4 text-mist-500">
                  品牌、版本、价格、续航、智驾、评分、备注与更新时间；UTF-8 BOM，Excel 直接打开。
                </div>
              </div>
              <Download className="mt-0.5 size-4 shrink-0 text-mist-500" />
            </button>

            <div className="rounded-xl border border-line/60 bg-white/[0.012] p-3.5">
              <div className="flex items-center justify-between gap-2 text-[10.5px]">
                <span className="text-mist-400">本地存储占用</span>
                <span className="num text-mist-300">{formatBytes(usage)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={cn('h-full rounded-full', progress > 80 ? 'bg-danger' : progress > 60 ? 'bg-warn' : 'bg-accent')}
                  style={{ width: `${Math.max(1, progress)}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[9.5px] text-mist-500">
                <span>最近保存：{saveStatus.at ? new Date(saveStatus.at).toLocaleString('zh-CN') : '尚未保存'}</span>
                <span>·</span>
                <span>{saveStatus.error ?? '浏览器关闭后仍保留'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title="导入数据"
            description="支持本应用导出的 JSON。导入前会校验结构并预览；可以选择替换全部数据或与当前数据合并。"
            action={<Upload className="size-4 text-mist-500" />}
          />
          <div
            className="mt-4 rounded-xl border border-dashed border-line-strong bg-white/[0.01] px-4 py-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              handleFile(event.dataTransfer.files?.[0])
            }}
          >
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-line-strong bg-ink-750 text-mist-400">
              <Upload className="size-4" />
            </div>
            <p className="mt-3 text-[11.5px] text-mist-300">拖拽 JSON 文件到这里，或点击选择文件</p>
            <p className="mt-1 text-[10px] text-mist-500">建议每次导入前先导出当前备份。</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <Button className="mt-3" size="sm" variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
              选择 JSON 文件
            </Button>
          </div>
          <div className="mt-4 space-y-2 text-[10px] leading-4 text-mist-500">
            <p>合并导入规则：同 ID 的车型以导入文件为准；新车型追加；报价按 ID 去重；设置与评分配置采用导入文件。</p>
            <p>导入不会删除未被引用的旧车型（合并模式下），但替换模式会完全覆盖当前数据。</p>
          </div>
        </section>
      </div>

      <section className="panel mt-5 p-4 sm:p-5">
        <SectionTitle
          title="数据健康"
          description="来源标注与数据缺口概览。这里不会自动修正任何参数。"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['官方来源字段', officialCount, 'text-teal-300'],
            ['媒体/实测/经销商', data.vehicles.reduce((sum, v) => sum + Object.values(v.provenance).filter((p) => p.status !== '官方' && p.status !== '待核实').length, 0), 'text-sky-300'],
            ['待核实字段', data.vehicles.reduce((sum, v) => sum + Object.values(v.provenance).filter((p) => p.status === '待核实').length, 0), 'text-amber-300'],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="rounded-xl border border-line/60 bg-white/[0.012] px-3.5 py-3">
              <div className="text-[9.5px] text-mist-500">{label}</div>
              <div className={cn('num mt-1 text-2xl font-semibold', String(color))}>{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th className="table-head text-left">车型</th>
                <th className="table-head text-right">来源</th>
                <th className="table-head text-right">官方字段</th>
                <th className="table-head text-right">报价</th>
                <th className="table-head text-right">最近更新</th>
                <th className="table-head text-right">数据完整度</th>
              </tr>
            </thead>
            <tbody>
              {data.vehicles.map((vehicle) => {
                const completeness = dataCompleteness(vehicle)
                const official = Object.values(vehicle.provenance).filter((p) => p.status === '官方').length
                return (
                  <tr key={vehicle.id}>
                    <td className="table-cell text-mist-200">{vehicle.brand} {vehicle.model}</td>
                    <td className="table-cell num text-right text-mist-400">{vehicle.sources.length}</td>
                    <td className="table-cell num text-right text-mist-400">{official}</td>
                    <td className="table-cell num text-right text-mist-400">{data.quotes.filter((q) => q.vehicleId === vehicle.id).length}</td>
                    <td className="table-cell num text-right text-mist-400">{formatDate(vehicle.updatedAt)}</td>
                    <td className="table-cell text-right">
                      <span className={cn('num text-[11px]', completeness >= 0.8 ? 'text-positive' : 'text-amber-300')}>
                        {Math.round(completeness * 100)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel mt-5 border-danger/20 p-4 sm:p-5">
        <SectionTitle
          title="危险操作"
          description="以下操作会改变或删除本地数据。请先导出 JSON 备份。"
          action={<AlertTriangle className="size-4 text-danger" />}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
            <div className="text-[11.5px] font-medium text-mist-200">恢复初始示例数据</div>
            <p className="mt-1 text-[10px] leading-4 text-mist-500">用 6 款初始车型、报价、手动评分与默认设置覆盖当前全部数据。</p>
            <Button className="mt-3" size="sm" variant="secondary" icon={RotateCcw} onClick={() => setConfirm('reset')}>
              恢复示例数据
            </Button>
          </div>
          <div className="rounded-xl border border-danger/20 bg-danger/[0.03] p-3.5">
            <div className="text-[11.5px] font-medium text-rose-200">清空车型与报价</div>
            <p className="mt-1 text-[10px] leading-4 text-mist-500">删除所有车型、报价、对比选择与排名快照，保留预算、成本与评分权重设置。</p>
            <Button className="mt-3" size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm('clear')}>
              清空数据
            </Button>
          </div>
        </div>
      </section>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false)
          setPending(null)
        }}
        title={pending?.ok ? '导入预览' : '导入失败'}
        description={pending?.fileName}
        size="md"
        footer={
          pending?.ok ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setImportOpen(false)
                  setPending(null)
                }}
              >
                取消
              </Button>
              <Button variant="secondary" onClick={() => applyImport('merge')}>
                合并到当前数据
              </Button>
              <Button variant="primary" onClick={() => applyImport('replace')}>
                替换全部数据
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setImportOpen(false)
                setPending(null)
              }}
            >
              关闭
            </Button>
          )
        }
      >
        {pending ? (
          <div className="space-y-4">
            {pending.ok && pending.data ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['车型', pending.data.vehicles.length],
                    ['报价', pending.data.quotes.length],
                    ['来源', pending.data.vehicles.reduce((sum, v) => sum + v.sources.length, 0)],
                    ['评分快照', pending.data.scoring.snapshots.length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2">
                      <div className="text-[9px] text-mist-500">{label}</div>
                      <div className="num mt-0.5 text-lg font-semibold text-mist-100">{value}</div>
                    </div>
                  ))}
                </div>
                {pending.warnings.length > 0 ? (
                  <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
                    <div className="mb-1.5 text-[10px] font-semibold text-amber-200">导入警告（{pending.warnings.length}）</div>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-[10px] leading-4 text-amber-100/70">
                      {pending.warnings.slice(0, 20).map((warning) => (
                        <li key={warning}>· {warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="rounded-lg border border-line/60 bg-white/[0.012] p-3 text-[10px] leading-4 text-mist-500">
                  替换会覆盖当前全部数据；合并会保留当前数据并追加/覆盖同 ID 条目。无论哪种模式，建议先取消并导出当前备份。
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-danger/25 bg-danger/[0.05] p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-rose-200">
                  <AlertTriangle className="size-4" /> 文件未通过校验
                </div>
                <ul className="space-y-1 text-[10.5px] leading-5 text-rose-100/80">
                  {pending.errors.map((error) => (
                    <li key={error}>· {error}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-mist-500">请确认文件来自本应用的「导出完整 JSON」，且未被手动破坏。</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="恢复初始示例数据？"
        description="当前所有车型、报价、评分、对比选择与设置都会被示例数据覆盖，且无法撤销。建议先导出完整 JSON 备份。"
        confirmLabel="覆盖并恢复"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          dispatch({ type: 'RESET_SEED' })
          setConfirm(null)
          toast('已恢复初始示例数据', 'info')
        }}
      />

      <ConfirmDialog
        open={confirm === 'clear'}
        title="清空车型与报价？"
        description="将删除所有车型、报价、对比选择与排名快照。预算、成本假设与评分权重会保留。此操作无法撤销。"
        confirmLabel="确认清空"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          dispatch({ type: 'CLEAR_ALL' })
          setConfirm(null)
          toast('已清空车型与报价', 'info')
        }}
      />
    </div>
  )
}
