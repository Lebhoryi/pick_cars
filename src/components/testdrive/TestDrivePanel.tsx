import { useEffect, useState } from 'react'
import { ClipboardCheck, Gauge, RotateCcw, Save } from 'lucide-react'
import type { TestDriveCriterionId, TestDriveRecord, Vehicle } from '@/types'
import { TEST_DRIVE_CRITERIA } from '@/types'
import { useApp } from '@/store/AppStore'
import { blankTestDrive, todayISO } from '@/lib/defaults'
import { cn } from '@/lib/format'
import { formatDriveScore, summarizeTestDrive, toTenPoint } from '@/lib/testDrive'
import { Badge, Button, ProgressBar, SectionTitle } from '@/components/ui/primitives'
import { Field } from '@/components/ui/Field'

const STEPS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

export function TestDrivePanel({
  vehicle,
  drive,
  others,
  onOpen,
}: {
  vehicle: Vehicle
  drive: TestDriveRecord | undefined
  others: Array<{ vehicle: Vehicle; drive: TestDriveRecord | undefined }>
  onOpen: (id: string) => void
}) {
  const [draft, setDraft] = useState<TestDriveRecord>(() => drive ?? blankTestDrive(vehicle.id))
  const { dispatch, toast } = useApp()

  useEffect(() => {
    setDraft(drive ?? blankTestDrive(vehicle.id))
  }, [drive, vehicle.id])

  const summary = summarizeTestDrive(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(drive ?? null)

  const setScore = (id: TestDriveCriterionId, score: number | null) => {
    setDraft((prev) => ({
      ...prev,
      scores: { ...prev.scores, [id]: { ...prev.scores[id], score } },
    }))
  }
  const setNote = (id: TestDriveCriterionId, note: string) => {
    setDraft((prev) => ({
      ...prev,
      scores: { ...prev.scores, [id]: { ...prev.scores[id], note } },
    }))
  }

  const save = () => {
    dispatch({ type: 'UPSERT_TEST_DRIVE', drive: { ...draft, date: draft.date || todayISO() } })
    toast('试驾记录已保存', 'success')
  }

  const reset = () => {
    if (drive) {
      dispatch({ type: 'DELETE_TEST_DRIVE', id: drive.id })
      toast('试驾记录已清空', 'info')
      return
    }
    setDraft(blankTestDrive(vehicle.id))
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_minmax(0,1fr)]">
      <section className="panel p-4 sm:p-5">
        <SectionTitle
          title="同路段试驾评分"
          description="0–5 分、0.5 步进；同一路段、同一天、前后排各坐一次再打分，才具备对比意义。"
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset}>
                {drive ? '清空' : '重置'}
              </Button>
              <Button size="sm" variant="primary" icon={Save} onClick={save} disabled={!dirty}>
                保存
              </Button>
            </div>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="试驾日期">
            <input
              type="date"
              className="field"
              value={draft.date}
              onChange={(event) => setDraft((prev) => ({ ...prev, date: event.target.value }))}
            />
          </Field>
          <Field label="路段 / 条件" className="sm:col-span-2">
            <input
              className="field"
              placeholder="如：杭州—上虞，高速 100–120km/h，天气晴，2 人"
              value={draft.route}
              onChange={(event) => setDraft((prev) => ({ ...prev, route: event.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-5 space-y-4">
          {TEST_DRIVE_CRITERIA.map((criterion) => {
            const item = draft.scores[criterion.id]
            return (
              <div key={criterion.id} className="rounded-xl border border-line/70 bg-white/[0.012] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-medium text-mist-200">{criterion.label}</div>
                    <div className="mt-0.5 text-[9.5px] text-mist-500">{criterion.hint}</div>
                  </div>
                  <span className={cn('num text-[15px] font-semibold', item.score === null ? 'text-mist-500' : 'text-accent')}>
                    {item.score === null ? '—' : item.score.toFixed(1)}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {STEPS.map((step) => {
                    const active = item.score === step
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setScore(criterion.id, active ? null : step)}
                        className={cn(
                          'num h-6 w-8 rounded-md border text-[10px] transition',
                          active
                            ? 'border-accent/60 bg-accent/15 text-accent'
                            : 'border-line/70 text-mist-400 hover:border-line-strong hover:text-mist-200',
                        )}
                      >
                        {step}
                      </button>
                    )
                  })}
                </div>

                <input
                  className="field mt-2 h-8 py-0 text-[11px]"
                  placeholder="这一项的备注（什么速度、什么动作、谁坐哪）"
                  value={item.note}
                  onChange={(event) => setNote(criterion.id, event.target.value)}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <Field label="一句话结论">
            <textarea
              className="field"
              rows={2}
              placeholder="如：T7 高速更静、变道更稳；Q06 后排更软但余震多，智驾 Q06 保守。"
              value={draft.summary}
              onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
            />
          </Field>
        </div>
      </section>

      <div className="min-w-0 space-y-5">
        <section className="panel p-4 sm:p-5">
          <SectionTitle title="本次均分" action={<Gauge className="size-4 text-mist-500" />} />
          <div className="mt-4 flex items-baseline gap-2">
            <span className="num text-[34px] font-semibold leading-none text-accent">
              {summary.average === null ? '—' : summary.average.toFixed(1)}
            </span>
            <span className="text-[11px] text-mist-500">/ 5（{summary.filled}/{summary.total} 项已评）</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={summary.average === null ? 0 : summary.average / 5} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-lg bg-white/[0.025] px-2 py-1.5">
              <div className="text-mist-500">折合 10 分制</div>
              <div className="num text-mist-200">{toTenPoint(summary.average) ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-white/[0.025] px-2 py-1.5">
              <div className="text-mist-500">最强 / 最弱</div>
              <div className="truncate text-mist-200" title={`${summary.best?.label ?? '—'} / ${summary.worst?.label ?? '—'}`}>
                {summary.best ? `${summary.best.score} · ${summary.best.label}` : '—'}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Badge tone={summary.filled === summary.total ? 'teal' : 'amber'}>
              {summary.filled === summary.total ? '实测数据完整' : `还差 ${summary.total - summary.filled} 项`}
            </Badge>
            <span className="text-[9.5px] text-mist-500">不改动 7 维权重</span>
          </div>
          <p className="mt-2 text-[9.5px] leading-4 text-mist-500">
            试驾分只用于校准个人偏好模型的手打分，不会自动改 7 维权重；两套分数冲突时，以你亲手试过的为准。
          </p>
        </section>

        <section className="panel p-4 sm:p-5">
          <SectionTitle title="同场对照" description="同一路段测过的其它车，均分从高到低。" action={<ClipboardCheck className="size-4 text-mist-500" />} />
          <div className="mt-4 space-y-2">
            {others.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong px-3 py-4 text-center text-[10.5px] text-mist-500">
                还没有其它车的试驾记录。
              </div>
            ) : (
              others.map(({ vehicle: other, drive: otherDrive }) => {
                const otherSummary = summarizeTestDrive(otherDrive)
                return (
                  <button
                    key={other.id}
                    type="button"
                    onClick={() => onOpen(other.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition',
                      other.id === vehicle.id ? 'border-accent/45 bg-accent/10' : 'border-line/70 hover:border-line-strong',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] text-mist-200">
                        {other.brand} {other.model}
                      </span>
                      <span className="block truncate text-[9px] text-mist-500">
                        {otherDrive?.route || '未填写路段'}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[11.5px] text-mist-300">
                      {formatDriveScore(otherSummary.average)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
          <div className="mt-3 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 text-[9.5px] leading-4 text-mist-500">
            建议测法：高速 80→120km/h 定速各 3 分钟听风噪胎噪；100km/h 左右连续两次变道看回正；20km/h 单侧轮过减速带前后排各一次；后排连坐 30 分钟；智驾用自己开通的版本跑同一段匝道。
          </div>
        </section>
      </div>
    </div>
  )
}
