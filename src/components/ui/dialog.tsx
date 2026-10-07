import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// shadcn/ui Dialog adaptado à identidade Kurio
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 motion-safe:animate-hero-fade" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-20 left-1/2 z-50 w-[calc(100%-32px)] max-w-[640px] -translate-x-1/2 rounded-lg border border-kurio-line bg-kurio-surface p-6 font-mono text-kurio-cream shadow-2xl motion-safe:animate-hero-fade',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-md transition-colors hover:text-kurio-orange-light"
          aria-label="Fechar"
        >
          <X size={20} aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription }
