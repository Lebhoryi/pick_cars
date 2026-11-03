import { ExternalLink, Pencil, Plus, Quote } from 'lucide-react'
import type { ReviewChannel, ReviewRecord, Vehicle } from '@/types'
import { REVIEW_CHANNELS, REVIEW_CHANNEL_META } from '@/types'
import { cn, formatDate } from '@/lib/format'
import { Badge, Button, IconButton, SectionTitle } from '@/components/ui/primitives'

const STANCE_TONES: Record<ReviewRecord['stance'], 'teal' | 'lime' | 'neutral' | 'amber' | 'rose'> = {
  推荐: 'teal',
  谨慎推荐: 'lime',
  中立: 'neutral',
  劝退: 'rose',
  未表态: 'amber',
}

export function StanceBadge({ stance }: { stance: ReviewRecord['stance'] }) {
  return <Badge tone={STANCE_TONES[stance]}>{stance}</Badge>
}

export function ReviewCard({
  review,
  compact = false,
  onEdit,
}: {
  review: ReviewRecord
  compact?: boolean
  onEdit?: () => void
}) {
  return (
    <article className="rounded-xl border border-line/70 bg-white/[0.012] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-mist-200">{review.channel}</span>
            <StanceBadge stance={review.stance} />
            <span className="num text-[10px] text-mist-500">{formatDate(review.publishedAt)}</span>
          </div>
          <a
            href={review.url || undefined}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'mt-1 block text-[12px] leading-5 text-mist-100 transition',
              review.url && 'hover:text-accent',
            )}
          >
            {review.title}
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {review.url ? (
            <a
              href={review.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-mist-500 transition hover:text-accent"
            >
              <ExternalLink className="size-3" /> B站
            </a>
          ) : null}
          {onEdit ? <IconButton label="编辑车评" icon={Pencil} onClick={onEdit} /> : null}
        </div>
      </div>

      {review.summary ? (
        <p className="mt-2 text-[11.5px] leading-5 text-mist-300">{review.summary}</p>
      ) : null}

      {!compact && review.points.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {review.points.map((point) => (
            <li key={point} className="flex gap-2 text-[11px] leading-5 text-mist-400">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-mist-500" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!compact && review.quotes.length > 0 ? (
        <div className="mt-2.5 space-y-1.5 border-l-2 border-accent/25 pl-3">
          {review.quotes.map((quote) => (
            <p key={quote} className="flex gap-1.5 text-[10.5px] leading-5 text-mist-500">
              <Quote className="mt-1 size-2.5 shrink-0 opacity-60" />
              <span>{quote}</span>
            </p>
          ))}
        </div>
      ) : null}

      {review.note ? (
        <p className="mt-2 text-[9.5px] leading-4 text-mist-600">{review.note}</p>
      ) : null}
    </article>
  )
}

export function ReviewPanel({
  vehicle,
  reviews,
  onEdit,
}: {
  vehicle: Vehicle
  reviews: ReviewRecord[]
  onEdit: (review: ReviewRecord | null) => void
}) {
  const grouped = REVIEW_CHANNELS.map((channel) => ({
    channel,
    items: reviews.filter((review) => review.channel === channel),
  }))

  return (
    <section className="panel p-4 sm:p-5">
      <SectionTitle
        title="车评"
        description="固定收录两个账号的公开评价。结论是账号观点，不是本工具的判断；要点为转述，原话用于回看核对。"
        action={
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => onEdit(null)}>
            新增车评
          </Button>
        }
      />

      <div className="mt-4 space-y-5">
        {grouped.map(({ channel, items }) => (
          <div key={channel}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] font-semibold text-mist-200">{channel}</span>
              <Badge tone="neutral">{items.length} 条</Badge>
              <span className="text-[9.5px] text-mist-500">{REVIEW_CHANNEL_META[channel as ReviewChannel].note}</span>
            </div>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong px-3 py-4 text-center text-[10.5px] text-mist-500">
                该账号尚未覆盖「{vehicle.brand} {vehicle.model}」，可手动补录。
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((review) => (
                  <ReviewCard key={review.id} review={review} onEdit={() => onEdit(review)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-line/60 bg-white/[0.012] px-3 py-2 text-[9.5px] leading-4 text-mist-500">
        车评来自 UP 主视频，结论带个人立场与商业环境，仅作参考；同一台车不同账号可能完全相反，冲突时看要点与试驾。
      </div>
    </section>
  )
}
