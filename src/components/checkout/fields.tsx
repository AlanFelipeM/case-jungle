import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTROL =
  'h-10 w-full border border-[#3f2319] bg-transparent px-3 text-sm text-kurio-cream placeholder:text-kurio-muted transition-colors focus-visible:border-kurio-orange focus-visible:outline-none disabled:cursor-not-allowed disabled:text-kurio-sand/80 aria-[invalid=true]:border-[#f4a28c]'

interface FieldProps {
  id: string
  label: React.ReactNode
  required?: boolean
  optional?: boolean
  /** Rótulo só para leitores de tela */
  hiddenLabel?: boolean
  error?: string
  hint?: string
  className?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; required?: boolean }) => React.ReactNode
}

export function Field({ id, label, required, optional, hiddenLabel, error, hint, className, children }: FieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn('mb-2 block text-[15px] leading-5', hiddenLabel && 'sr-only')}
      >
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-[#f0805f]">
            *
          </span>
        )}
        {optional && <span className="text-kurio-sand"> (opcional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, required })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-kurio-sand">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-[#f4a28c]">
          {error}
        </p>
      )}
    </div>
  )
}

export const TextInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(function TextInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(CONTROL, className)} {...props} />
})

export const SelectInput = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(function SelectInput(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(CONTROL, 'appearance-none pr-10 [&>option]:bg-kurio-surface', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-kurio-sand"
      />
    </div>
  )
})

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(function TextArea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(CONTROL, 'h-[151px] resize-none py-2.5', className)} {...props} />
})
