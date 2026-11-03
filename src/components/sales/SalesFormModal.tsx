import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Trash2 } from 'lucide-react'
import type { SalesRecord, SalesScope, Vehicle, Verification } from '@/types'
import { SALES_SCOPES, VERIFICATION_LEVELS } from '@/types'
import { useApp } from '@/store/AppStore'
import { blankSalesRecord } from '@/lib/defaults'
import { cn } from '@/lib/format'
import { formatUnits, monthLabel, monthRange, shortMonth, windowStartOf } from '@/lib/sales'
import { Badge, Button } from '@/components/ui/primitives'
import { Field, NumberInput, Select, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'

function recordFor(records: SalesRecord[], month: string): SalesRecord | undefined {
  return records.find((record) => record.month === month)
}

export function SalesFormModal({
  open,
  vehicle,
  records,
  windowEnd,
  onClose,
}: {
  open: boolean
  vehicle: Vehicle
  records: SalesRecord[]
  windowEnd: string
  onClose: () => void
}) {
  const { dispatch, toast } = useApp()
  const months = useMemo(() => monthRange(windowStartOf(vehicle), windowEnd), [vehicle, windowEnd])
  const [draft, setDraft] = useState<SalesRecord>(() => blankSalesRecord(vehicle.id))
  const [isNew, setIsNew] = useState(true)

  const loadMonth = (month: string) => {
    const existing = recordFor(records, month)
    if (existing) {
      setDraft({ ...existing })
      setIsNew(false)
      return
    }
    setDraft(blankSalesRecord(vehicle.id, { month }))
    setIsNew(true)
  }

  useEffect(() => {
    if (!open) return
    const firstEmpty = months.find((month) => !recordFor(records, month)) ?? months[months.length - 1]
    if (!firstEmpty) return
    loadMonth(firstEmpty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle.id, windowEnd])

  const update = (patch: Partial<SalesRecord>) => setDraft((prev) => ({ ...prev, ...patch }))

  const save = () => {
    const units = draft.units
    if (units !== null && (!Number.isFinite(units) || units < 0)) {
      toast('销量必须是非负数字。', 'warning')
      return
    }
    dispatch({ type: 'UPSERT_SALES', record: draft })
    toast(`${monthLabel(draft.month)} 销量已保存`, 'success')
    onClose()
  }

  const remove = () => {
    const existing = records.find((record) => record.month === draft.month)
    if (!existing) {
      setDraft(blankSalesRecord(vehicle.id, { month: draft.month }))
      return
    }
    dispatch({ type: 'DELETE_SALES', id: existing.id })
    toast(`${monthLabel(existing.month)} 记录已删除`, 'info')
    loadMonth(draft.month)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`销量 · ${vehicle.brand} ${vehicle.model}`}
      description={`统计窗口从 ${monthLabel(windowStartOf(vehicle))} 起（上市月与 2026-01 取较晚者），缺数据的月份保留「待核实」，不补 0。`}
      footer={
        <>
          {!isNew ? (
            <Button variant="danger" size="sm" icon={Trash2} className="mr-auto" onClick={remove}>
              删除本月记录
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={save}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11.5px] font-medium text-mist-300">
            <CalendarRange className="size-3.5 text-mist-500" />
            选择月份
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {months.map((month) => {
              const record = recordFor(records, month)
              const active = draft.month === month
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => loadMonth(month)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-left transition',
                    active
                      ? 'border-accent/45 bg-accent/10'
                      : 'border-line/70 bg-white/[0.012] hover:border-line-strong',
                  )}
                >
                  <div className={cn('text-[10.5px]', active ? 'text-accent' : 'text-mist-400')}>{shortMonth(month)}</div>
                  <div className="num mt-0.5 text-[11.5px] font-medium text-mist-200">
                    {record && record.units !== null ? formatUnits(record.units) : '待核实'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="月份">
            <TextInput
              type="month"
              value={draft.month}
              onChange={(event) => {
                const next = event.target.value
                if (!next) return
                loadMonth(next)
              }}
            />
          </Field>
          <Field label="当月销量" hint="单位「辆」。留空表示该月未公布。">
            <NumberInput value={draft.units} onChange={(value) => update({ units: value })} min={0} unit="辆" />
          </Field>
          <Field label="统计口径">
            <Select
              value={draft.scope}
              onChange={(value) => update({ scope: value as SalesScope })}
              options={[...SALES_SCOPES]}
            />
          </Field>
          <Field label="可信度">
            <Select
              value={draft.status}
              onChange={(value) => update({ status: value as Verification })}
              options={[...VERIFICATION_LEVELS]}
            />
          </Field>
          <Field label="来源标注">
            <TextInput
              value={draft.sourceLabel}
              placeholder="如：长安启源 10 月战报"
              onChange={(event) => update({ sourceLabel: event.target.value })}
            />
          </Field>
          <Field label="来源链接">
            <TextInput
              value={draft.sourceUrl}
              placeholder="https://"
              onChange={(event) => update({ sourceUrl: event.target.value })}
            />
          </Field>
        </div>

        <Field label="备注" hint="口径说明、是否官方拆分、为什么留空等">
          <textarea
            className="field"
            rows={3}
            value={draft.note}
            placeholder="如：官方只公布品牌合计，未拆分单车型。"
            onChange={(event) => update({ note: event.target.value })}
          />
        </Field>

        <div className="rounded-xl border border-line/70 bg-white/[0.012] px-3.5 py-3 text-[10.5px] leading-5 text-mist-500">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone="neutral">口径提示</Badge>
          </div>
          不同品牌披露口径不同：长安启源/比亚迪多为「批发」，深蓝用「交付」，乘联会榜为「零售」。跨车型直接比较前，先看清口径；
          本工具只做数量级参考，不替代乘联会原始数据。
        </div>
      </div>
    </Modal>
  )
}
