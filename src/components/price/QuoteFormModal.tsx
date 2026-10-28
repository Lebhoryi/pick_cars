import { useEffect, useMemo, useState } from 'react'
import { Calculator, Save, Trash2 } from 'lucide-react'
import type { PriceQuote } from '@/types'
import { VERIFICATION_LEVELS } from '@/types'
import { blankQuote, todayISO } from '@/lib/defaults'
import { computeBreakdown, computeBreakdown as breakdownFor } from '@/lib/price'
import { formatWan } from '@/lib/format'
import { taxPolicyShort } from '@/lib/tax'
import { useApp } from '@/store/AppStore'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Badge, Button, Divider } from '@/components/ui/primitives'
import { Field, MoneyInput, NumberInput, Select, TextInput, Toggle } from '@/components/ui/Field'

export function QuoteFormModal({
  open,
  vehicleId,
  quote,
  onClose,
}: {
  open: boolean
  vehicleId: string
  quote: PriceQuote | null
  onClose: () => void
}) {
  const { data, dispatch, toast } = useApp()
  const [draft, setDraft] = useState<PriceQuote>(() => blankQuote(vehicleId))
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    if (quote) {
      setDraft(structuredClone(quote))
    } else {
      const latest = data.quotes
        .filter((q) => q.vehicleId === vehicleId)
        .sort((a, b) => b.date.localeCompare(a.date))[0]
      const base = blankQuote(vehicleId, {
        label: latest ? '价格更新' : '首次报价',
        date: todayISO(),
        status: latest?.status ?? '待核实',
        sourceUrl: latest?.sourceUrl ?? '',
        sourceLabel: latest?.sourceLabel ?? '',
        guidePrice: latest?.guidePrice ?? null,
        officialPrice: latest?.officialPrice ?? null,
        dealerPrice: latest?.dealerPrice ?? null,
        limitedDiscount: latest?.limitedDiscount ?? null,
        cashDiscount: latest?.cashDiscount ?? null,
        conditionalDiscount: latest?.conditionalDiscount ?? null,
        tradeInSubsidy: latest?.tradeInSubsidy ?? null,
        optionTotal: latest?.optionTotal ?? null,
        adasPack: latest?.adasPack ?? null,
        insurance: latest?.insurance ?? data.settings.defaultInsurance,
        plateFee: latest?.plateFee ?? data.settings.defaultPlateFee,
        includeTradeIn: latest?.includeTradeIn ?? false,
        includeConditional: latest?.includeConditional ?? false,
      })
      setDraft(base)
    }
    setError('')
    setConfirmDelete(false)
  }, [open, quote, vehicleId, data.quotes, data.settings.defaultInsurance, data.settings.defaultPlateFee])

  const preview = useMemo(() => computeBreakdown(draft, data.settings), [draft, data.settings])
  const vehicle = data.vehicles.find((v) => v.id === vehicleId)

  const update = (patch: Partial<PriceQuote>) => setDraft((prev) => ({ ...prev, ...patch }))

  const save = () => {
    if (draft.guidePrice === null && draft.officialPrice === null && draft.dealerPrice === null) {
      setError('至少填写官方指导价 / 当前官方价 / 经销商报价中的一项。')
      return
    }
    if (!draft.date) {
      setError('请填写报价日期。')
      return
    }
    const cleaned: PriceQuote = {
      ...draft,
      label: draft.label.trim() || '未命名报价',
      sourceLabel: draft.sourceLabel.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      conditions: draft.conditions.trim(),
      note: draft.note.trim(),
    }
    dispatch({ type: quote ? 'UPDATE_QUOTE' : 'ADD_QUOTE', quote: cleaned })
    toast(quote ? '报价已更新' : '新报价已记录', 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={quote ? '编辑报价' : '记录新报价'}
      description={vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.trim}` : '报价'}
      size="lg"
      footer={
        <>
          {quote ? (
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              className="mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              删除报价
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" icon={Save} onClick={save}>
            保存报价
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-rose-200">{error}</div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="报价日期" required>
            <TextInput type="date" value={draft.date} onChange={(e) => update({ date: e.target.value })} />
          </Field>
          <Field label="报价标签">
            <TextInput value={draft.label} placeholder="如 双十一门店报价" onChange={(e) => update({ label: e.target.value })} />
          </Field>
          <Field label="数据可信度">
            <Select value={draft.status} onChange={(v) => update({ status: v as PriceQuote['status'] })} options={[...VERIFICATION_LEVELS]} />
          </Field>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-mist-200">车价与优惠</h3>
            <span className="text-[10px] text-mist-500">单位：万元 · 现金优惠与附加条件优惠分开记录</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="官方指导价">
              <MoneyInput value={draft.guidePrice} onChange={(v) => update({ guidePrice: v })} />
            </Field>
            <Field label="当前官方售价">
              <MoneyInput value={draft.officialPrice} onChange={(v) => update({ officialPrice: v })} />
            </Field>
            <Field label="经销商报价" hint="视为优惠前报价；若已含优惠，请把现金优惠填 0">
              <MoneyInput value={draft.dealerPrice} onChange={(v) => update({ dealerPrice: v })} />
            </Field>
            <Field label="限时优惠（信息项）" hint="仅记录，不重复扣减；当前价已按优惠后填写">
              <MoneyInput value={draft.limitedDiscount} onChange={(v) => update({ limitedDiscount: v })} />
            </Field>
            <Field label="现金优惠" hint="无条件、可直接抵扣">
              <MoneyInput value={draft.cashDiscount} onChange={(v) => update({ cashDiscount: v })} />
            </Field>
            <Field label="附加条件优惠" hint="需店内保险/贷款/置换等，默认不计入">
              <MoneyInput value={draft.conditionalDiscount} onChange={(v) => update({ conditionalDiscount: v })} />
            </Field>
            <Field label="置换补贴" hint="符合条件才可享受，默认不计入">
              <MoneyInput value={draft.tradeInSubsidy} onChange={(v) => update({ tradeInSubsidy: v })} />
            </Field>
          </div>
        </div>

        <Divider />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-mist-200">选装与保险</h3>
            <span className="text-[10px] text-mist-500">智驾包单独填写，不与普通选装重复</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="其他选装合计">
              <MoneyInput value={draft.optionTotal} onChange={(v) => update({ optionTotal: v })} />
            </Field>
            <Field label="智驾升级包">
              <MoneyInput value={draft.adasPack} onChange={(v) => update({ adasPack: v })} />
            </Field>
            <Field label="保险费用">
              <NumberInput value={draft.insurance} onChange={(v) => update({ insurance: v })} unit="元" step={100} />
            </Field>
            <Field label="上牌/服务费">
              <NumberInput value={draft.plateFee} onChange={(v) => update({ plateFee: v })} unit="元" step={100} />
            </Field>
            <Field label="其他费用">
              <NumberInput value={draft.otherFee} onChange={(v) => update({ otherFee: v })} unit="元" step={100} />
            </Field>
            <Field label="购置税覆盖值" hint="留空则按购车日期与政策自动计算">
              <NumberInput value={draft.taxOverride} onChange={(v) => update({ taxOverride: v })} unit="元" step={100} placeholder="自动计算" />
            </Field>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={draft.includeConditional}
              onChange={(checked) => update({ includeConditional: checked })}
              label="将附加条件优惠计入落地价"
              description="勾选后会明确标注为「有条件」口径"
            />
            <Toggle
              checked={draft.includeTradeIn}
              onChange={(checked) => update({ includeTradeIn: checked })}
              label="将置换补贴计入落地价"
              description="需要旧车及符合政策，保守比较时建议不勾选"
            />
          </div>
        </div>

        <Divider />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-mist-200">
              <Calculator className="size-3.5" /> 落地价预览
            </h3>
            <Badge tone="blue">{taxPolicyShort(preview.policy)}</Badge>
          </div>
          <div className="rounded-xl border border-line/80 bg-ink-900/50 p-4">
            <div className="space-y-2 text-[11.5px]">
              {[
                ['车价基准（经销商价优先）', formatWan(preview.basePrice)],
                ['现金优惠', preview.cashOff ? `- ${formatWan(preview.cashOff)}` : '—'],
                ['附加条件优惠', preview.conditionalOff ? `- ${formatWan(preview.conditionalOff)}` : '未计入'],
                ['预计裸车成交价', formatWan(preview.netCar)],
                ['选装 + 智驾包', formatWan(preview.optionTotal + preview.adasPack)],
                ['购置税', formatWan(preview.tax)],
                ['保险 + 上牌 + 其他', formatWan(preview.insurance + preview.plateFee + preview.otherFee)],
                ['置换补贴', preview.tradeInSubsidy ? `- ${formatWan(preview.tradeInSubsidy)}` : '未计入'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-mist-500">{label}</span>
                  <span className="num text-mist-200">{value}</span>
                </div>
              ))}
              <div className="my-2 h-px bg-line/70" />
              <div className="flex items-end justify-between gap-4">
                <span className="text-xs text-mist-300">预计落地价</span>
                <span className="num text-xl font-semibold text-accent">{formatWan(preview.landing)}</span>
              </div>
              {preview.budgetDelta !== null ? (
                <div className="text-right text-[10px] text-mist-500">
                  {preview.budgetDelta > 0 ? '超出' : '低于'}预算上限 {formatWan(Math.abs(preview.budgetDelta))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 rounded-lg border border-line/60 bg-white/[0.015] px-3 py-2 text-[10px] leading-4 text-mist-500">
              {preview.taxNote}
              <br />
              保险与上牌若未填写，将使用设置页默认值；两者均为估算，可手动覆盖。
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="来源名称">
            <TextInput value={draft.sourceLabel} placeholder="如 汽车之家车型页 / 门店报价单" onChange={(e) => update({ sourceLabel: e.target.value })} />
          </Field>
          <Field label="来源 URL">
            <TextInput value={draft.sourceUrl} placeholder="https://" onChange={(e) => update({ sourceUrl: e.target.value })} />
          </Field>
          <Field label="适用条件" className="sm:col-span-2">
            <textarea
              className="field"
              rows={2}
              value={draft.conditions}
              placeholder="如：需本月下订、店内保险、置换同品牌旧车…"
              onChange={(e) => update({ conditions: e.target.value })}
            />
          </Field>
          <Field label="备注" className="sm:col-span-2">
            <textarea
              className="field"
              rows={2}
              value={draft.note}
              placeholder="价格口径、赠品、金融方案、上牌地等"
              onChange={(e) => update({ note: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="删除这条报价？"
        description={`将删除 ${draft.date} 的「${draft.label}」报价记录，无法撤销。建议先导出 JSON 备份。`}
        confirmLabel="删除报价"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (quote) dispatch({ type: 'DELETE_QUOTE', id: quote.id })
          toast('报价记录已删除', 'info')
          setConfirmDelete(false)
          onClose()
        }}
      />
    </Modal>
  )
}
