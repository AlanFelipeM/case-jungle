import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      role="status"
      aria-label="Carregando..."
      aria-busy="true"
    />
  )
}

export function NFTCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="grid aspect-[258/300] place-items-center bg-kurio-surface px-1">
        <div className="skeleton aspect-square w-full rounded-2xl" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-3 h-5 w-24" />
    </div>
  )
}

export function NFTGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-[34px] md:gap-y-16"
      role="status"
      aria-label="Carregando NFTs..."
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <NFTCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function HeroSkeleton() {
  return (
    // Mesma geometria do HeroBanner para evitar layout shift (CLS)
    <div role="status" aria-label="Carregando destaques..." aria-busy="true">
      <div className="skeleton h-[184px] rounded-2xl md:hidden" />
    <div className="mx-auto hidden max-w-[1200px] gap-8 md:grid lg:grid-cols-[1fr_400px] lg:gap-[30px] xl:grid-cols-[1fr_450px]">
      <div className="flex flex-col lg:pl-10 lg:pt-10">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton mt-3 h-[84px] w-full max-w-[490px] sm:h-[108px] lg:h-[132px]" />
        <div className="skeleton mt-2 h-[72px] w-full max-w-[550px]" />
        <div className="skeleton mt-8 h-10 w-[140px]" />
      </div>
      <div className="skeleton mx-auto aspect-square w-full max-w-[450px] rounded-3xl lg:max-w-none" />
    </div>
    </div>
  )
}

export function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-kurio-surface" aria-hidden="true">
      <div className="skeleton aspect-[268/195] w-full rounded-none" />
      <div className="space-y-3 px-4 pt-3 pb-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}
