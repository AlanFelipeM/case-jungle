import React from 'react'
import type { NFT } from '@/types'
import { SearchIcon } from '@/components/icons'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Vistas da obra: a imagem completa e recortes ampliados de detalhes
const VIEWS = [
  { label: 'Obra completa', scale: 1, origin: '50% 50%' },
  { label: 'Detalhe do rosto', scale: 1.7, origin: '50% 36%' },
  { label: 'Detalhe do acessório', scale: 1.9, origin: '50% 84%' },
  { label: 'Detalhe do fundo', scale: 1.6, origin: '12% 14%' },
] as const

type View = (typeof VIEWS)[number]

function ViewImage({
  nft,
  view,
  sizes,
  className,
  priority = false,
}: {
  nft: NFT
  view: View
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <img
      src={nft.imageLarge}
      srcSet={`${nft.image} 480w, ${nft.imageLarge} 900w`}
      sizes={sizes}
      alt=""
      width={900}
      height={900}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      draggable={false}
      style={{ transform: `scale(${view.scale})`, transformOrigin: view.origin }}
      className={cn('size-full object-cover transition-transform duration-500', className)}
    />
  )
}

export function NftGallery({ nft }: { nft: NFT }) {
  const [active, setActive] = React.useState(0)
  const [zoomOpen, setZoomOpen] = React.useState(false)
  const view = VIEWS[active]

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-7">
      {/* Miniaturas */}
      <ul aria-label="Imagens do NFT" className="hidden grid-cols-4 gap-3 md:grid lg:flex lg:w-[100px] lg:shrink-0 lg:flex-col lg:gap-4">
        {VIEWS.map((v, i) => (
          <li key={v.label}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              aria-label={`${v.label} (${i + 1} de ${VIEWS.length})`}
              className={cn(
                'block aspect-square w-full overflow-hidden rounded-lg ring-offset-2 ring-offset-kurio-bg transition',
                i === active ? 'ring-2 ring-kurio-orange' : 'opacity-80 hover:opacity-100',
              )}
            >
              <ViewImage nft={nft} view={v} sizes="100px" />
            </button>
          </li>
        ))}
      </ul>

      {/* Imagem principal */}
      <div className="relative md:bg-kurio-surface md:p-5 lg:size-[444px] lg:shrink-0">
        <div className="aspect-square overflow-hidden rounded-[24px] md:rounded-3xl">
          <ViewImage
            nft={nft}
            view={view}
            priority
            sizes="(min-width: 1024px) 404px, (min-width: 768px) calc(100vw - 88px), calc(100vw - 40px)"
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {view.label}
        </p>
        {/* Mobile: toque na imagem amplia */}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Ampliar imagem"
          className="absolute inset-0 rounded-[24px] md:hidden"
        />
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Ampliar imagem"
          className="absolute top-4 right-3 hidden md:grid size-8 place-items-center rounded-full bg-[#1d1310] text-kurio-cream transition-colors hover:text-kurio-orange-light"
        >
          <SearchIcon size={16} />
        </button>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="top-1/2 max-w-[min(900px,calc(100vh-48px))] -translate-y-1/2 p-3 sm:p-4">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">{view.label} em tamanho ampliado</DialogDescription>
          <div className="aspect-square overflow-hidden rounded-2xl">
            <ViewImage nft={nft} view={view} sizes="(min-width: 900px) 900px, 100vw" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
