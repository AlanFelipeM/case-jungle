import { X } from 'lucide-react'
import { dismissToast, useToasts } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const toasts = useToasts()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[70] flex flex-col items-center gap-2 font-mono md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex max-w-[360px] items-start gap-3 rounded-md border bg-kurio-surface px-4 py-3 text-sm text-kurio-cream shadow-2xl motion-safe:animate-hero-fade',
            t.tone === 'error' ? 'border-[#f4a28c]/60' : 'border-kurio-orange/60',
          )}
        >
          <p className="flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Fechar aviso"
            className="-mr-1 grid size-6 shrink-0 place-items-center rounded hover:text-kurio-orange-light"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
