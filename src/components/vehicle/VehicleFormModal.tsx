import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  Armchair,
  Car,
  FileText,
  ImagePlus,
  Link2,
  Package,
  Plus,
  Radar,
  Ruler,
  Save,
  ShieldCheck,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react'
import type { OptionPackage, Provenance, SourceRef, Vehicle, VehicleSpecs } from '@/types'
import { BODY_TYPES, ENERGY_TYPES, FOCUS_STATUSES, SOURCE_KINDS, SOURCE_KIND_LABELS, VERIFICATION_LEVELS } from '@/types'
import { ACCENTS, blankVehicle, todayISO, uid } from '@/lib/defaults'
import { SPEC_GROUPS, setSpecValue } from '@/data/specSchema'
import { compressImage, formatBytes } from '@/lib/image'
import { cn } from '@/lib/format'
import { useApp } from '@/store/AppStore'
import { Modal } from '@/components/ui/Modal'
import { Button, Badge, SectionTitle } from '@/components/ui/primitives'
import { Field, MoneyInput, NumberInput, Select, TabBar, TextInput, Toggle } from '@/components/ui/Field'
import { SpecFieldEditor } from '@/components/vehicle/SpecFieldEditor'
import { VehicleCover } from '@/components/vehicle/VehicleVisuals'

type FormTab = 'base' | 'notes' | 'options' | 'sources' | keyof VehicleSpecs

const GROUP_ICONS: Record<keyof VehicleSpecs, typeof Car> = {
  basic: Car,
  powertrain: Zap,
  body: Ruler,
  chassis: Wrench,
  comfort: Armchair,
  adas: Radar,
  safety: ShieldCheck,
}

export function VehicleFormModal({
  open,
  vehicle,
  initialGroup,
  onClose,
}: {
  open: boolean
  vehicle: Vehicle | null
  initialGroup?: FormTab
  onClose: () => void
}) {
  const { dispatch, toast } = useApp()
  const [draft, setDraft] = useState<Vehicle>(() => structuredClone(vehicle ?? blankVehicle()))
  const [tab, setTab] = useState<FormTab>('base')
  const [error, setError] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()

  useEffect(() => {
    if (!open) return
    const next = structuredClone(vehicle ?? blankVehicle())
    setDraft(next)
    setTagsText(next.tags.join('、'))
    setError('')
    setTab(initialGroup ?? 'base')
    setUploading(false)
  }, [open, vehicle, initialGroup])

  const update = (patch: Partial<Vehicle>) => setDraft((prev) => ({ ...prev, ...patch }))

  const updateSpec = (path: string, value: unknown) => {
    setDraft((prev) => {
      const next = structuredClone(prev)
      setSpecValue(next.specs, path, value)
      return next
    })
  }

  const updateProv = (path: string, prov: Provenance | undefined) => {
    setDraft((prev) => {
      const provenance = { ...prev.provenance }
      if (prov) provenance[path] = prov
      else delete provenance[path]
      return { ...prev, provenance }
    })
  }

  const updateSource = (id: string, patch: Partial<SourceRef>) => {
    setDraft((prev) => ({
      ...prev,
      sources: prev.sources.map((source) => (source.id === id ? { ...source, ...patch } : source)),
    }))
  }

  const addSource = () => {
    const source: SourceRef = {
      id: uid('src'),
      label: '',
      url: '',
      kind: 'official',
      date: todayISO(),
    }
    setDraft((prev) => ({ ...prev, sources: [...prev.sources, source] }))
  }

  const updateOption = (id: string, patch: Partial<OptionPackage>) => {
    setDraft((prev) => ({
      ...prev,
      optionPackages: prev.optionPackages.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg)),
    }))
  }

  const addOption = () => {
    const pkg: OptionPackage = {
      id: uid('opt'),
      name: '',
      price: null,
      kind: '舒适',
      includes: '',
      required: false,
    }
    setDraft((prev) => ({ ...prev, optionPackages: [...prev.optionPackages, pkg] }))
  }

  const handleCover = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const image = await compressImage(file)
      update({ coverImage: image.dataUrl })
      toast(`封面已压缩：${formatBytes(image.originalBytes)} → ${formatBytes(image.bytes)}`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : '封面处理失败', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = () => {
    if (!draft.brand.trim() || !draft.model.trim()) {
      setError('品牌与车型名称为必填项，请先补全。')
      setTab('base')
      return
    }
    const cleaned: Vehicle = {
      ...draft,
      brand: draft.brand.trim(),
      model: draft.model.trim(),
      year: draft.year.trim() || '待确认',
      trim: draft.trim.trim(),
      driveType: draft.driveType.trim(),
      reason: draft.reason.trim(),
      notes: draft.notes.trim(),
      testDrive: draft.testDrive.trim(),
      eliminateReason: draft.eliminateReason.trim(),
      tags: tagsText
        .split(/[,，、\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      pros: draft.pros.map((v) => v.trim()).filter(Boolean),
      cons: draft.cons.map((v) => v.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'UPSERT_VEHICLE', vehicle: cleaned })
    toast(vehicle ? '车型信息已更新' : '新车型已加入车库', 'success')
    onClose()
  }

  const tabs: Array<{ id: FormTab; label: string; icon: ReactNode }> = [
    { id: 'base', label: '基础档案', icon: <Car className="size-3.5" /> },
    ...SPEC_GROUPS.filter((group) => group.id === 'basic').map((group) => {
      const Icon = GROUP_ICONS[group.id]
      return { id: group.id as FormTab, label: group.short, icon: <Icon className="size-3.5" /> }
    }),
    { id: 'notes', label: '笔记与评价', icon: <FileText className="size-3.5" /> },
    ...SPEC_GROUPS.filter((group) => group.id !== 'basic').map((group) => {
      const Icon = GROUP_ICONS[group.id]
      return { id: group.id as FormTab, label: group.short, icon: <Icon className="size-3.5" /> }
    }),
    { id: 'options', label: '选装包', icon: <Package className="size-3.5" /> },
    { id: 'sources', label: '资料来源', icon: <Link2 className="size-3.5" /> },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vehicle ? `编辑 · ${vehicle.brand} ${vehicle.model}` : '新增车型'}
      description="所有字段都可以后续修改；关键参数建议标注来源与核实日期。"
      size="xl"
      bodyClassName="p-0"
      footer={
        <>
          <span className="mr-auto hidden text-[11px] text-mist-500 sm:inline">
            {draft.updatedAt ? `最近更新 ${draft.updatedAt.slice(0, 10)}` : ''}
          </span>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" icon={Save} onClick={save} disabled={uploading}>
            保存车型
          </Button>
        </>
      }
    >
      <div className="border-b border-line/70 px-4 pt-2 sm:px-6">
        <TabBar tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="px-4 py-5 sm:px-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {tab === 'base' ? (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="品牌" required>
                    <TextInput value={draft.brand} placeholder="如 极狐 / 比亚迪" onChange={(e) => update({ brand: e.target.value })} />
                  </Field>
                  <Field label="车型" required>
                    <TextInput value={draft.model} placeholder="如 T7 / 海狮 06 EV" onChange={(e) => update({ model: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="年款">
                    <TextInput value={draft.year} placeholder="2026款 / 待确认" onChange={(e) => update({ year: e.target.value })} />
                  </Field>
                  <Field label="具体版本">
                    <TextInput value={draft.trim} placeholder="如 715 ULTRA 乾崑版" onChange={(e) => update({ trim: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="车型类别">
                    <Select value={draft.bodyType} onChange={(v) => update({ bodyType: v as Vehicle['bodyType'] })} options={[...BODY_TYPES]} />
                  </Field>
                  <Field label="能源类型">
                    <Select value={draft.energyType} onChange={(v) => update({ energyType: v as Vehicle['energyType'] })} options={[...ENERGY_TYPES]} />
                  </Field>
                  <Field label="驱动形式">
                    <TextInput value={draft.driveType} placeholder="后驱 / 四驱" onChange={(e) => update({ driveType: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="关注状态">
                    <Select
                      value={draft.focusStatus}
                      onChange={(v) => update({ focusStatus: v as Vehicle['focusStatus'] })}
                      options={[...FOCUS_STATUSES]}
                    />
                  </Field>
                  <Field label="关注日期">
                    <TextInput type="date" value={draft.followedAt} onChange={(e) => update({ followedAt: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="标签" hint="用逗号或空格分隔，便于筛选">
                    <TextInput value={tagsText} placeholder="如 800V、长续航" onChange={(e) => setTagsText(e.target.value)} />
                  </Field>
                  <div className="flex items-end pb-1">
                    <Toggle
                      checked={draft.keyCandidate}
                      onChange={(checked) => update({ keyCandidate: checked })}
                      label="设为重点候选"
                      description="总览与评分排序会优先标记"
                    />
                  </div>
                </div>
                <Field label="关注原因">
                  <textarea
                    className="field"
                    rows={2}
                    value={draft.reason}
                    placeholder="为什么关注这款车？最在意它的哪一点？"
                    onChange={(e) => update({ reason: e.target.value })}
                  />
                </Field>
              </div>

              <div className="space-y-3">
                <div className="label">车辆封面</div>
                <VehicleCover vehicle={draft} className="h-[168px] rounded-xl border border-line/70" />
                <div className="flex flex-wrap gap-2">
                  <input
                    id={fileInputId}
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCover(e.target.files?.[0])}
                  />
                  <Button size="sm" icon={ImagePlus} variant="secondary" disabled={uploading} onClick={() => document.getElementById(fileInputId)?.click()}>
                    {uploading ? '处理中…' : '上传封面'}
                  </Button>
                  {draft.coverImage ? (
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => update({ coverImage: undefined })}>
                      移除
                    </Button>
                  ) : null}
                </div>
                <p className="text-[10.5px] leading-4 text-mist-500">
                  图片会压缩后存入浏览器本地存储；也可以不设置，使用自动生成的车侧剪影。建议使用 16:9 或 3:2 图片。
                </p>
                <div>
                  <div className="label mb-2">强调色</div>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`选择强调色 ${color}`}
                        onClick={() => update({ accent: color })}
                        className={cn(
                          'size-6 rounded-full border-2 transition',
                          draft.accent === color ? 'border-white scale-110' : 'border-transparent hover:scale-105',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
              <div className="flex items-center gap-2">
                <Badge tone="blue">提示</Badge>
                <span className="text-[11.5px] text-mist-300">基础档案只保存「车是谁」，参数请到「三电 / 空间 / 底盘」等标签页填写，价格在「价格追踪」中单独记录。</span>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'notes' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label="优点" hint="每行一条，显示为独立条目">
                <textarea
                  className="field"
                  rows={4}
                  value={draft.pros.join('\n')}
                  placeholder={'华为乾崑智驾\n大空间\n800V 快充'}
                  onChange={(e) => update({ pros: e.target.value.split('\n') })}
                />
              </Field>
              <Field label="缺点" hint="每行一条，便于对比时快速回看">
                <textarea
                  className="field"
                  rows={4}
                  value={draft.cons.join('\n')}
                  placeholder={'部分配置待核实\n品牌保值率一般'}
                  onChange={(e) => update({ cons: e.target.value.split('\n') })}
                />
              </Field>
              <Field label="试驾感受">
                <textarea
                  className="field"
                  rows={4}
                  value={draft.testDrive}
                  placeholder="底盘滤震、转向、隔音、座椅、智驾实际表现…"
                  onChange={(e) => update({ testDrive: e.target.value })}
                />
              </Field>
            </div>
            <div className="space-y-4">
              <Field label="个人备注">
                <textarea
                  className="field"
                  rows={7}
                  value={draft.notes}
                  placeholder="门店报价、销售政策、颜色喜好、家人意见…"
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </Field>
              <Field label="淘汰原因" hint="仅当状态为「暂时淘汰」时填写">
                <textarea
                  className="field"
                  rows={3}
                  value={draft.eliminateReason}
                  placeholder="如：后排头部空间不足 / 落地超预算 / 等改款"
                  onChange={(e) => update({ eliminateReason: e.target.value })}
                />
              </Field>
              <div className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5 text-[11px] leading-5 text-mist-400">
                <span className="font-medium text-mist-200">评分为个人偏好模型，不是客观质量排名。</span>
                <br />
                手动评分在「评分模型」页面统一调整，避免在编辑车型时误改权重或分数。
              </div>
            </div>
          </div>
        ) : null}

        {tab !== 'base' && tab !== 'notes' && tab !== 'options' && tab !== 'sources' ? (
          <div>
            {(() => {
              const group = SPEC_GROUPS.find((g) => g.id === tab)
              if (!group) return null
              return (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-mist-100">{group.label}</h3>
                      <p className="mt-1 max-w-2xl text-[11px] leading-4 text-mist-500">{group.description}</p>
                    </div>
                    <Badge tone="neutral">点击字段右上角可标注来源</Badge>
                  </div>
                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    {group.fields.map((field) => {
                      const path = `${group.id}.${field.key}`
                      const [g, key] = path.split('.')
                      const value = (draft.specs as unknown as Record<string, Record<string, unknown>>)[g]?.[key]
                      return (
                        <div key={path} className={cn(field.type === 'textarea' && 'sm:col-span-2 xl:col-span-3')}>
                          <SpecFieldEditor
                            field={field}
                            value={value}
                            prov={draft.provenance[path]}
                            sources={draft.sources}
                            onChange={(next) => updateSpec(path, next)}
                            onProv={(prov) => updateProv(path, prov)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : null}

        {tab === 'options' ? (
          <div className="space-y-4">
            <SectionTitle
              title="选装包与智驾包"
              description="价格以元记录；在报价中可选择计入。智驾升级包单独列出，避免与普通选装重复计算。"
              action={
                <Button size="sm" icon={Plus} onClick={addOption}>
                  添加选装包
                </Button>
              }
            />
            {draft.optionPackages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-xs text-mist-500">
                暂无选装包。若该版本需要额外购买智驾/舒适包，请在此登记。
              </div>
            ) : (
              <div className="space-y-3">
                {draft.optionPackages.map((pkg) => (
                  <div key={pkg.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="名称">
                        <TextInput value={pkg.name} placeholder="如 天神之眼 B" onChange={(e) => updateOption(pkg.id, { name: e.target.value })} />
                      </Field>
                      <Field label="价格">
                        <MoneyInput value={pkg.price} onChange={(price) => updateOption(pkg.id, { price })} />
                      </Field>
                      <Field label="类型">
                        <Select
                          value={pkg.kind}
                          onChange={(v) => updateOption(pkg.id, { kind: v as OptionPackage['kind'] })}
                          options={['智驾', '舒适', '外观', '其他']}
                        />
                      </Field>
                      <div className="flex items-end pb-1">
                        <Toggle checked={pkg.required} onChange={(required) => updateOption(pkg.id, { required })} label="强制/必选" />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Field label="包含内容">
                        <TextInput value={pkg.includes} placeholder="激光雷达、城市 NOA、软件服务…" onChange={(e) => updateOption(pkg.id, { includes: e.target.value })} />
                      </Field>
                      <div className="flex items-end pb-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              optionPackages: prev.optionPackages.filter((p) => p.id !== pkg.id),
                            }))
                          }
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'sources' ? (
          <div className="space-y-4">
            <SectionTitle
              title="资料来源"
              description="官方配置表、官方购车页优先；媒体/经销商报价仅作交叉验证。每条来源都应有可访问的 URL。"
              action={
                <Button size="sm" icon={Plus} onClick={addSource}>
                  添加来源
                </Button>
              }
            />
            {draft.sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-xs text-mist-500">
                还没有来源。至少添加一个官方页面，便于后续复核。
              </div>
            ) : (
              <div className="space-y-3">
                {draft.sources.map((source) => (
                  <div key={source.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
                    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                      <Field label="来源名称">
                        <TextInput value={source.label} placeholder="如 极狐阿尔法T7 官方产品页" onChange={(e) => updateSource(source.id, { label: e.target.value })} />
                      </Field>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="类型">
                          <select
                            className="field"
                            value={source.kind}
                            onChange={(event) => updateSource(source.id, { kind: event.target.value as SourceRef['kind'] })}
                          >
                            {SOURCE_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {SOURCE_KIND_LABELS[kind]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="日期">
                          <TextInput type="date" value={source.date ?? ''} onChange={(e) => updateSource(source.id, { date: e.target.value })} />
                        </Field>
                        <Field label="发布方">
                          <TextInput value={source.publisher ?? ''} placeholder="可选" onChange={(e) => updateSource(source.id, { publisher: e.target.value })} />
                        </Field>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Field label="URL">
                        <TextInput value={source.url} placeholder="https://" onChange={(e) => updateSource(source.id, { url: e.target.value })} />
                      </Field>
                      <div className="flex items-end pb-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              sources: prev.sources.filter((s) => s.id !== source.id),
                              provenance: Object.fromEntries(
                                Object.entries(prev.provenance).filter(([, value]) => value.sourceId !== source.id),
                              ),
                            }))
                          }
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
              <div className="label mb-2">当前来源类型说明</div>
              <div className="flex flex-wrap gap-2">
                {SOURCE_KINDS.map((kind) => (
                  <Badge key={kind} tone={kind === 'official' ? 'teal' : kind === 'media' ? 'blue' : kind === 'test' ? 'lime' : kind === 'dealer' ? 'violet' : 'amber'}>
                    {SOURCE_KIND_LABELS[kind]}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-4 text-mist-500">
                可信度标记与来源类型相互独立：一条媒体来源也可以标注「媒体」，但具体字段是否核实仍需单独确认。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
