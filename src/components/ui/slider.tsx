import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

// shadcn/ui Slider adaptado à identidade Kurio
function Slider({
  className,
  thumbLabels = [],
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabels?: string[] }) {
  const values = props.value ?? props.defaultValue ?? [props.min ?? 0]

  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none items-center select-none', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-kurio-orange/35">
        <SliderPrimitive.Range className="absolute h-full bg-kurio-orange" />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabels[i]}
          className="block size-4 rounded-full bg-kurio-orange ring-[3px] ring-kurio-bg transition-shadow hover:ring-kurio-orange/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kurio-orange"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
