import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ReviewChannel, ReviewRecord, ReviewStance, Vehicle, Verification } from '@/types'
import { REVIEW_CHANNELS, REVIEW_CHANNEL_META, REVIEW_STANCES, VERIFICATION_LEVELS } from '@/types'
import { useApp } from '@/store/AppStore'
import { blankReview } from '@/lib/defaults'
import { Badge, Button } from '@/components/ui/primitives'
import { Field, Select, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'

export function ReviewFormModal({
  open,
  vehicle,
  review,
  onClose,
}: {
  open: boolean
  vehicle: Vehicle
  review: ReviewRecord | null
  onClose: () => void
}) {
  const { dispatch, toast } = useApp()
  const [draft, setDraft] = useState<ReviewRecord>(() => blankReview(vehicle.id))

  useEffect(() => {
    if (!open) return
    setDraft(review ? { ...review } : blankReview(vehicle.id))
  }, [open, review, vehicle.id])

  const update = (patch: Partial<ReviewRecord>) => setDraft((prev) => ({ ...prev, ...patch }))

  const save = () => {
    if (!draft.title.trim() && !draft.summary.trim()) {
      toast('至少填标题或一句话结论。', 'warning')
      return
    }
    dispatch({ type: 'UPSERT_REVIEW', review: { ...draft, title: draft.title.trim() || '未命名车评' } })
    toast('车评已保存', 'success')
    onClose()
  }

  const remove = () => {
    if (!review) return
    dispatch({ type: 'DELETE_REVIEW', id: review.id })
    toast('车评已删除', 'info')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`车评 · ${vehicle.brand} ${vehicle.model}`}
      description="只记录账号自己说过的结论与要点，别把自己的判断写进去；原话留一两句就够回看核对。"
      footer={
        <>
          {review ? (
            <Button variant="danger" size="sm" icon={Trash2} className="mr-auto" onClick={remove}>
              删除这条
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
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="账号">
            <Select
              value={draft.channel}
              onChange={(value) => update({ channel: value as ReviewChannel })}
              options={[...REVIEW_CHANNELS]}
            />
          </Field>
          <Field label="结论">
            <Select
              value={draft.stance}
              onChange={(value) => update({ stance: value as ReviewStance })}
              options={[...REVIEW_STANCES]}
            />
          </Field>
          <Field label="视频标题" hint="建议照抄原标题，便于以后搜回原视频">
            <TextInput
              value={draft.title}
              placeholder="如：银河TT买不买？多对比MG07"
              onChange={(event) => update({ title: event.target.value })}
            />
          </Field>
          <Field label="链接">
            <TextInput
              value={draft.url}
              placeholder="https://www.bilibili.com/video/BV..."
              onChange={(event) => update({ url: event.target.value })}
            />
          </Field>
          <Field label="发布日期">
            <TextInput
              type="date"
              value={draft.publishedAt.slice(0, 10)}
              onChange={(event) => update({ publishedAt: event.target.value })}
            />
          </Field>
          <Field label="可信度">
            <Select
              value={draft.status}
              onChange={(value) => update({ status: value as Verification })}
              options={[...VERIFICATION_LEVELS]}
            />
          </Field>
        </div>

        <Field label="一句话结论">
          <textarea
            className="field"
            rows={2}
            value={draft.summary}
            placeholder="如：车本身没大毛病，但品牌溢价还没撑到 15 万，普通人不建议冲首发。"
            onChange={(event) => update({ summary: event.target.value })}
          />
        </Field>

        <Field label="关键要点" hint="每行一条，写账号的理由，不写结论以外的评价">
          <textarea
            className="field"
            rows={4}
            value={draft.points.join('\n')}
            placeholder={'三电与底盘配置对得起价格\n智驾是选装，基础版城市 NOA 能力有限\n保值率与售后网点是短板'}
            onChange={(event) => update({ points: event.target.value.split('\n') })}
          />
        </Field>

        <Field label="原话摘录" hint="每行一句，尽量保留口语原句（转录可能有识别误差）">
          <textarea
            className="field"
            rows={3}
            value={draft.quotes.join('\n')}
            placeholder={'这台车本身没什么问题，问题是这个价格你为什么要买它'}
            onChange={(event) => update({ quotes: event.target.value.split('\n') })}
          />
        </Field>

        <Field label="备注" hint="视频覆盖范围、是否含广告、与其他款对比口径等">
          <textarea
            className="field"
            rows={2}
            value={draft.note}
            placeholder="如：盘点视频中的一段，约 2 分钟；全程无广。"
            onChange={(event) => update({ note: event.target.value })}
          />
        </Field>

        <div className="rounded-xl border border-line/70 bg-white/[0.012] px-3.5 py-3 text-[10.5px] leading-5 text-mist-500">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone="neutral">{draft.channel}</Badge>
          </div>
          {REVIEW_CHANNEL_META[draft.channel].note}
        </div>
      </div>
    </Modal>
  )
}
