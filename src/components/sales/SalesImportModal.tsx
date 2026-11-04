import { useMemo, useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import type { SalesScope, Verification } from '@/types'
import { SALES_SCOPES, VERIFICATION_LEVELS } from '@/types'
import { useApp } from '@/store/AppStore'
import { currentMonth } from '@/lib/sales'
import { parseSalesPaste } from '@/lib/salesImport'
import { cn } from '@/lib/format'
import { Badge, Button, SectionTitle } from '@/components/ui/primitives'
import { Field, Select, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'

const DCD_URL = 'https://www.dongchedi.com/sales'

export function SalesImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, dispatch, toast } = useApp()
  const [month, setMonth] = useState(currentMonth())
  const [scope, setScope] = useState<SalesScope>('零售')
  const [status, setStatus] = useState<Verification>('媒体')
  const [text, setText] = useState('')

  const parsed = useMemo(() => parseSalesPaste(text, data.vehicles), [text, data.vehicles])
  const valid = parsed.rows.filter((row) => row.vehicleId && row.units !== null)

  const save = () => {
    if (valid.length === 0) {
      toast('没有解析出可导入的行。', 'warning')
      return
    }
    for (const row of valid) {
      const existing = data.sales.find((sale) => sale.vehicleId === row.vehicleId && sale.month === month)
      dispatch({
        type: 'UPSERT_SALES',
        record: {
          id: existing?.id ?? `sale_${row.vehicleId}_${month.replace('-', '')}`,
          vehicleId: row.vehicleId as string,
          month,
          units: row.units,
          scope,
          status,
          sourceUrl: DCD_URL,
          sourceLabel: '懂车帝销量榜',
          note: `从懂车帝榜单粘贴导入（${scope}口径）。`,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        },
      })
    }
    toast(`已导入 ${valid.length} 条 ${month} 销量`, 'success')
    setText('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="从懂车帝粘贴导入销量"
      description="在懂车帝销量榜页面选中「排名 + 车型 + 销量」几列，直接 Ctrl+V 贴进来；车型名按库里 8 款车匹配。"
      size="lg"
      footer={
        <>
          <span className="mr-auto text-[10.5px] text-mist-500">
            识别到 {valid.length} 款车{parsed.unmatched.length > 0 ? `，未匹配 ${parsed.unmatched.length} 行` : ''}
          </span>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={save} disabled={valid.length === 0}>
            导入 {month}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="统计月份">
          <TextInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </Field>
        <Field label="口径">
          <Select value={scope} onChange={(value) => setScope(value as SalesScope)} options={[...SALES_SCOPES]} />
        </Field>
        <Field label="可信度">
          <Select
            value={status}
            onChange={(value) => setStatus(value as Verification)}
            options={[...VERIFICATION_LEVELS]}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="粘贴榜单内容">
          <textarea
            className={cn('field min-h-[180px] font-mono text-[11px] leading-5')}
            placeholder={'示例（懂车帝销量榜复制过来即可，列顺序随意）：\n1  深蓝S07      6,062\n2  启源Q06      10,152\n3  海狮06EV     8,873'}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </Field>
      </div>

      {parsed.rows.length > 0 ? (
        <div className="mt-4">
          <SectionTitle title="解析预览" action={<ClipboardPaste className="size-4 text-mist-500" />} />
          <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line/70">
            <table className="data-table w-full">
              <tbody>
                {parsed.rows.map((row, index) => (
                  <tr key={`${row.line}-${index}`}>
                    <td className="px-3 py-1.5 text-[11px] text-mist-300">{row.vehicleName || '—'}</td>
                    <td className="num px-3 py-1.5 text-right text-[11px] text-mist-200">
                      {row.units === null ? '—' : row.units.toLocaleString('zh-CN')}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {row.vehicleId && row.units !== null ? <Badge tone="teal">将导入</Badge> : <Badge tone="amber">未匹配</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
