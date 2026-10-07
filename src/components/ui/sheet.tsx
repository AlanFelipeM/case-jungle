import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// shadcn/ui Sheet (painel lateral sobre Radix Dialog) adaptado à identidade Kurio
const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-hero-fade" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[340px] flex-col overflow-y-auto bg-kurio-bg font-mono text-kurio-cream shadow-2xl motion-safe:animate-sheet-in',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="grid size-10 place-items-center rounded-md transition-colors hover:text-kurio-orange-light"
            aria-label="Fechar"
          >
            <X size={22} aria-hidden />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent }
