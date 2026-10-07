import React from 'react'
import type { NFT } from '@/types'
import { NFTCard } from '@/components/ui/NFTCard'
import { NFTCardSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const SWIPE_THRESHOLD = 40

/** Itens por página conforme a largura: 5 (desktop), 3 (tablet), 2 (mobile) */
function usePerPage() {
  const get = () =>
    window.matchMedia('(min-width: 1024px)').matches ? 5 : window.matchMedia('(min-width: 768px)').matches ? 3 : 2
  const [perPage, setPerPage] = React.useState(get)
  React.useEffect(() => {
    const queries = ['(min-width: 1024px)', '(min-width: 768px)'].map((q) => window.matchMedia(q))
    const onChange = () => setPerPage(get())
    queries.forEach((q) => q.addEventListener('change', onChange))
    return () => queries.forEach((q) => q.removeEventListener('change', onChange))
  }, [])
  return perPage
}

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-[26px] lg:grid-cols-5'

interface NftCarouselProps {
  title: string
  items: NFT[]
  isLoading?: boolean
  /** Muda quando o contexto muda (ex.: outro NFT), voltando à primeira página */
  resetKey?: string
  className?: string
}

/** Carrossel paginado de NFTs com pontos de página e swipe */
export function NftCarousel({ title, items, isLoading = false, resetKey, className }: NftCarouselProps) {
  const headingId = React.useId()
  const perPage = usePerPage()
  const [page, setPage] = React.useState(0)
  const swipeStart = React.useRef<number | null>(null)

  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(page, pages - 1)
  const visible = items.slice(current * perPage, current * perPage + perPage)

  React.useEffect(() => setPage(0), [resetKey])

  if (!isLoading && items.length === 0) return null

  function onPointerUp(event: React.PointerEvent) {
    if (swipeStart.current === null) return
    const dx = event.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    setPage((p) => Math.min(Math.max(p + (dx < 0 ? 1 : -1), 0), pages - 1))
  }

  return (
    <section aria-labelledby={headingId} className={cn('mt-20 md:mt-24', className)}>
      <h2
        id={headingId}
        className="border-b border-kurio-line pb-2 text-base leading-6 font-bold text-kurio-orange-light sm:text-[17px]"
      >
        {title}
      </h2>

      {isLoading ? (
        <div className={cn(GRID, 'mt-8')} role="status" aria-label="Carregando NFTs...">
          {Array.from({ length: perPage }).map((_, i) => (
            <NFTCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <ul
            aria-roledescription="carrossel"
            aria-label={`${title}, página ${current + 1} de ${pages}`}
            onPointerDown={(e) => (swipeStart.current = e.clientX)}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipeStart.current = null)}
            className={cn(GRID, 'mt-8 touch-pan-y motion-safe:animate-hero-fade')}
            key={`${current}-${perPage}`}
          >
            {visible.map((item) => (
              <li key={item.id}>
                <NFTCard nft={item} compact />
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <div role="group" aria-label="Páginas do carrossel" className="mt-4 flex justify-center">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`Página ${i + 1}`}
                  aria-current={i === current ? 'true' : undefined}
                  className="group grid size-6 place-items-center rounded-full"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'size-3 rounded-full border border-kurio-orange transition-colors',
                      i === current ? 'bg-kurio-orange' : 'group-hover:bg-kurio-orange/40',
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
