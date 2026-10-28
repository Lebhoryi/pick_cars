import { useState } from 'react'
import { ChevronDown, Link2, Trash2 } from 'lucide-react'
import type { Provenance, SourceRef, Verification } from '@/types'
import { VERIFICATION_LEVELS } from '@/types'
import type { SpecField } from '@/data/specSchema'
import { formatSpecValue } from '@/data/specSchema'
import { cn } from '@/lib/format'
import { Field, NumberInput, Select, TextInput } from '@/components/ui/Field'

const STATUS_DOT: Record<string, string> = {
  官方: 'bg-teal-300',
  媒体: 'bg-sky-300',
  经销商: 'bg-violet-300',
  实测: 'bg-lime-300',
  个人: 'bg-amber-300',
  待核实: 'bg-mist-500',
  未标注: 'bg-amber-400',
}

export function SpecFieldEditor({
  field,
  value,
  prov,
  sources,
  onChange,
  onProv,
}: {
  field: SpecField
  value: unknown
  prov?: Provenance
  sources: SourceRef[]
  onChange: (value: unknown) => void
  onProv: (prov: Provenance | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const status = prov?.status ?? (value === null || value === '' ? '待核实' : '未标注')

  const updateProv = (patch: Partial<Provenance>) => {
    onProv({ status: prov?.status ?? '待核实', ...prov, ...patch })
  }

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[11.5px] font-medium text-mist-300">{field.label}</label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition',
            prov?.status === '官方'
              ? 'border-teal-300/25 bg-teal-300/10 text-teal-200'
              : prov?.status === '媒体'
                ? 'border-sky-300/25 bg-sky-300/10 text-sky-200'
                : prov?.status === '实测'
                  ? 'border-lime-300/25 bg-lime-300/10 text-lime-200'
                  : prov?.status === '个人'
                    ? 'border-amber-300/25 bg-amber-300/10 text-amber-200'
                    : 'border-line-strong bg-white/[0.02] text-mist-500 hover:text-mist-300',
          )}
          title="标注该字段的来源与核实日期"
        >
          <span className={cn('size-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-mist-500')} />
          {status}
          <ChevronDown className={cn('size-2.5 transition', open && 'rotate-180')} />
        </button>
      </div>

      {field.type === 'number' ? (
        <NumberInput
          value={typeof value === 'number' ? value : null}
          onChange={(next) => onChange(next)}
          step={field.step}
          unit={field.unit}
          placeholder="待核实"
        />
      ) : field.type === 'boolean' ? (
        <Select
          value={value === true ? '有' : value === false ? '无' : ''}
          onChange={(next) => onChange(next === '有' ? true : next === '无' ? false : null)}
          options={['有', '无']}
          placeholder="待核实"
        />
      ) : field.type === 'select' ? (
        <Select
          value={typeof value === 'string' ? value : ''}
          onChange={(next) => onChange(next)}
          options={field.options ?? []}
          placeholder="待核实"
        />
      ) : field.type === 'textarea' ? (
        <textarea
          className="field"
          rows={3}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <TextInput
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {field.hint ? <div className="mt-1 text-[10px] leading-4 text-mist-500">{field.hint}</div> : null}
      <div className="mt-1 text-[10px] text-mist-500">当前值：{formatSpecValue(field, value)}</div>

      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border border-line-strong/70 bg-ink-900/60 p-2.5 animate-fade">
          <div className="grid grid-cols-2 gap-2">
            <Field label="可信度">
              <Select
                value={prov?.status ?? '待核实'}
                onChange={(next) => updateProv({ status: next as Verification })}
                options={[...VERIFICATION_LEVELS]}
              />
            </Field>
            <Field label="核实日期">
              <TextInput
                type="date"
                value={prov?.checkedAt?.slice(0, 10) ?? ''}
                onChange={(event) => updateProv({ checkedAt: event.target.value })}
              />
            </Field>
          </div>
          <Field label="关联来源">
            <select
              className="field"
              value={prov?.sourceId ?? ''}
              onChange={(event) => {
                const source = sources.find((s) => s.id === event.target.value)
                updateProv({ sourceId: source?.id, url: source?.url })
              }}
            >
              <option value="">手动填写 / 不关联</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="来源 URL">
            <TextInput
              value={prov?.url ?? ''}
              placeholder="https://"
              onChange={(event) => updateProv({ url: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="口径 / 条件">
              <TextInput
                value={prov?.condition ?? ''}
                placeholder="如 CLTC / SOC 30–80%"
                onChange={(event) => updateProv({ condition: event.target.value })}
              />
            </Field>
            <Field label="备注">
              <TextInput
                value={prov?.note ?? ''}
                placeholder="可选"
                onChange={(event) => updateProv({ note: event.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-mist-500">
              <Link2 className="size-3" /> 建议每个关键参数都关联来源
            </span>
            <button
              type="button"
              onClick={() => {
                onProv(undefined)
                setOpen(false)
              }}
              className="inline-flex items-center gap-1 text-[10px] text-mist-500 transition hover:text-danger"
            >
              <Trash2 className="size-3" /> 清除标注
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
