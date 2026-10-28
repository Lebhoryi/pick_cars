import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  Check,
  ExternalLink,
  Info,
  Percent,
  RotateCcw,
  Save,
  Scale,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react'
import { TAX_POLICY_MODES, TAX_POLICY_LABELS, type AppSettings } from '@/types'
import { useApp } from '@/store/AppStore'
import { defaultSettings } from '@/lib/defaults'
import { TAX_POLICY_URL } from '@/data/seed'
import { resolvePolicy, taxPolicyShort } from '@/lib/tax'
import { cn, formatDate, formatWan, monthsUntil } from '@/lib/format'
import { Badge, Button, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Field, MoneyInput, NumberInput, TextInput } from '@/components/ui/Field'

export function SettingsPage() {
  const { data, dispatch, toast } = useApp()
  const [draft, setDraft] = useState<AppSettings>(() => structuredClone(data.settings))
  const [confirmReset, setConfirmReset] = useState(false)
  const [error, setError] = useState('')

  const dirty = JSON.stringify(draft) !== JSON.stringify(data.settings)
  const resolved = resolvePolicy(draft.taxPolicy, draft.targetPurchaseDate)
  const months = monthsUntil(draft.targetPurchaseDate)

  const update = (patch: Partial<AppSettings>) => setDraft((prev) => ({ ...prev, ...patch }))

  const save = () => {
    if (!draft.targetPurchaseDate) {
      setError('请填写预计购车日期。')
      return
    }
    if (draft.budgetMax <= draft.budgetMin) {
      setError('预算上限必须大于预算下限。')
      return
    }
    dispatch({ type: 'SET_SETTINGS', settings: draft })
    setError('')
    toast('设置已保存', 'success')
  }

  const taxShare = resolved === 'exempt' ? '免征' : resolved === 'half' ? '5%（减半）' : '10%（全额）'

  return (
    <div>
      <PageHeader
        title="设置"
        subtitle="预算、购车时间与估算口径会影响总览、落地价和评分筛选。评分权重与硬性条件在「评分模型」中单独调整。"
        meta={
          <>
            <Badge tone="teal" dot>
              目标 {formatDate(draft.targetPurchaseDate)}
            </Badge>
            <Badge tone="neutral">预算 {formatWan(draft.budgetMin)}–{formatWan(draft.budgetMax)}</Badge>
            <Badge tone="amber">{taxPolicyShort(resolved)}</Badge>
          </>
        }
        actions={
          <>
            <Button variant="ghost" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
              恢复默认
            </Button>
            <Button variant={dirty ? 'primary' : 'secondary'} icon={dirty ? Save : Check} onClick={save} disabled={!dirty && !error}>
              {dirty ? '保存设置' : '已保存'}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="购车计划"
              description="用于总览倒计时、预算偏差与硬性筛选的默认值。"
              action={<CalendarClock className="size-4 text-mist-500" />}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="称呼">
                <TextInput value={draft.ownerName} onChange={(event) => update({ ownerName: event.target.value })} placeholder="车主" />
              </Field>
              <Field label="购车城市">
                <TextInput value={draft.purchaseCity} onChange={(event) => update({ purchaseCity: event.target.value })} placeholder="如 杭州" />
              </Field>
              <Field label="预算下限">
                <MoneyInput value={draft.budgetMin} onChange={(value) => update({ budgetMin: value ?? 0 })} />
              </Field>
              <Field label="预算上限">
                <MoneyInput value={draft.budgetMax} onChange={(value) => update({ budgetMax: value ?? 0 })} />
              </Field>
              <Field label="预计购车日期" hint={months !== null ? `距计划约 ${months} 个月` : undefined}>
                <TextInput type="date" value={draft.targetPurchaseDate} onChange={(event) => update({ targetPurchaseDate: event.target.value })} />
              </Field>
              <div className="flex items-end pb-0.5">
                <div className="w-full rounded-xl border border-line/70 bg-white/[0.012] px-3.5 py-3">
                  <div className="text-[9px] uppercase tracking-wider text-mist-500">预算区间</div>
                  <div className="num mt-1 text-sm font-medium text-mist-100">
                    {formatWan(draft.budgetMin)} – {formatWan(draft.budgetMax)}
                  </div>
                  {draft.budgetMax <= draft.budgetMin ? (
                    <div className="mt-1 text-[10px] text-danger">上限需大于下限</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="购置税口径"
              description="纯电车型不默认免税。2027 年购车通常适用减半征收，但最终以开票时政策与车型目录资格为准。"
              action={<Percent className="size-4 text-mist-500" />}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="计算方式" hint="自动模式按预计购车日期判断">
                <select
                  className="field"
                  value={draft.taxPolicy}
                  onChange={(event) => update({ taxPolicy: event.target.value as AppSettings['taxPolicy'] })}
                >
                  {TAX_POLICY_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {TAX_POLICY_LABELS[mode]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="rounded-xl border border-line/70 bg-white/[0.012] px-3.5 py-3">
                <div className="text-[9px] uppercase tracking-wider text-mist-500">当前生效口径</div>
                <div className="mt-1 text-sm font-medium text-mist-100">{TAX_POLICY_LABELS[draft.taxPolicy]}</div>
                <div className="mt-0.5 text-[10px] text-mist-500">
                  实际税率 {taxShare} · 适用日期 {formatDate(draft.targetPurchaseDate)}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[10px] leading-4 text-mist-500">
              <p>2024–2025：免征，减税额上限 3 万元/辆；2026–2027：减半征收，减税额上限 1.5 万元/辆；2028 起默认按 10% 全额估算。</p>
              <p>计税价格 = 含增值税成交价 ÷ 1.13；保险、上牌与选装是否计入以报价记录为准。</p>
              <a href={TAX_POLICY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-mist-400 transition hover:text-accent">
                <ExternalLink className="size-3" /> 官方政策原文
              </a>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="默认估算值"
              description="报价未填写保险/上牌时使用；这些值会明确标注为估算。"
              action={<Wallet className="size-4 text-mist-500" />}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="首年保险默认值">
                <NumberInput value={draft.defaultInsurance} onChange={(value) => update({ defaultInsurance: value ?? 0 })} unit="元" step={100} min={0} />
              </Field>
              <Field label="上牌/服务费默认值">
                <NumberInput value={draft.defaultPlateFee} onChange={(value) => update({ defaultPlateFee: value ?? 0 })} unit="元" step={100} min={0} />
              </Field>
              <Field label="信息过期提醒" hint="超过该天数未核实，在总览标记">
                <NumberInput value={draft.staleDays} onChange={(value) => update({ staleDays: value ?? 90 })} unit="天" step={10} min={7} max={365} />
              </Field>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="个人偏好模型"
              description="权重、评分与硬性条件不在本页修改，避免误触影响排序。"
              action={<Scale className="size-4 text-mist-500" />}
            />
            <div className="mt-4 space-y-2 text-[11px]">
              <div className="flex items-center justify-between border-b border-line/40 pb-2">
                <span className="text-mist-500">评分模式</span>
                <span className="text-mist-200">{data.scoring.mode === 'manual' ? '手动评分' : '自动评分'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-line/40 pb-2">
                <span className="text-mist-500">权重合计</span>
                <span className="num text-mist-200">
                  {Object.values(data.scoring.weights).reduce((sum, value) => sum + value, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line/40 pb-2">
                <span className="text-mist-500">最高落地预算</span>
                <span className="num text-mist-200">{formatWan(data.settings.hardFilters.maxLanding)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-line/40 pb-2">
                <span className="text-mist-500">最低续航</span>
                <span className="num text-mist-200">{data.settings.hardFilters.minRange ?? '未设置'} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist-500">城市 NOA 硬性要求</span>
                <span className="text-mist-200">{data.settings.hardFilters.requireCityNoa ? '必须标配' : '不强制'}</span>
              </div>
            </div>
            <Link to="/score" className="mt-4 inline-flex items-center gap-1 text-[10.5px] text-accent">
              前往评分模型调整 <ExternalLink className="size-3" />
            </Link>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle title="数据与隐私" action={<ShieldCheck className="size-4 text-mist-500" />} />
            <div className="mt-3 space-y-2 text-[10px] leading-4 text-mist-500">
              <p>所有数据保存在当前浏览器 LocalStorage，不会自动上传到服务器。清除浏览器站点数据会删除记录，请定期导出 JSON 备份。</p>
              <p>封面图会压缩后保存，可能占用较多本地空间；如接近上限，请减少图片或删除不需要的车型。</p>
              <p>本工具不提供实时车价、金融方案或税务意见；所有价格与参数均需人工核对来源。</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/data">
                <Button size="sm" variant="secondary" icon={Check}>
                  打开数据管理
                </Button>
              </Link>
              <Link to="/garage">
                <Button size="sm" variant="ghost">
                  返回车型库
                </Button>
              </Link>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <SectionTitle title="关于" action={<Info className="size-4 text-mist-500" />} />
            <div className="mt-3 space-y-1.5 text-[10px] leading-4 text-mist-500">
              <p>CARFLEET · 个人选车工作台 · v1.0.0</p>
              <p>React + TypeScript + Vite + Tailwind CSS + Recharts。</p>
              <p>评分是个人偏好模型，不是客观车辆质量排名；不构成购车建议。</p>
              <p className="text-mist-600">数据模型版本 {data.version} · {data.vehicles.length} 款车型 · {data.quotes.length} 条报价</p>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="恢复默认设置？"
        description="将把预算、购车日期、税政口径、默认保险/上牌费、成本假设、硬性筛选与评分权重全部恢复为初始值。车型与报价不会删除。"
        confirmLabel="恢复默认"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          dispatch({ type: 'SET_SETTINGS', settings: defaultSettings() })
          dispatch({
            type: 'SET_SCORING',
            scoring: {
              ...data.scoring,
              weights: {
                price: 20,
                adas: 20,
                chassis: 15,
                range: 15,
                space: 15,
                cockpit: 10,
                brand: 5,
              },
            },
          })
          setDraft(defaultSettings())
          setConfirmReset(false)
          toast('已恢复默认设置', 'info')
        }}
      />
    </div>
  )
}
