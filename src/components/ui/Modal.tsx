import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button, IconButton } from '@/components/ui/primitives'

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[96vw]',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  bodyClassName,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: keyof typeof SIZES
  closeOnBackdrop?: boolean
  bodyClassName?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/78 backdrop-blur-sm animate-fade"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden border border-line-strong bg-ink-850 shadow-[0_50px_120px_-40px_rgba(0,0,0,1)] animate-rise sm:rounded-2xl',
          'rounded-t-2xl',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line/80 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold tracking-tight text-mist-100">{title}</h2>
            {description ? <p className="mt-1 text-xs leading-5 text-mist-400">{description}</p> : null}
          </div>
          <IconButton label="关闭" icon={X} onClick={onClose} />
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/80 bg-ink-900/40 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认删除',
  cancelLabel = '取消',
  tone = 'danger',
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl border',
            tone === 'danger' ? 'border-danger/25 bg-danger/10 text-danger' : 'border-accent/25 bg-accent/10 text-accent',
          )}
        >
          <TriangleAlert className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] leading-6 text-mist-200">{description}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </Modal>
  )
}
