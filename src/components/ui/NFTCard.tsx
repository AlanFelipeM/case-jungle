import React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { NFT } from '@/types'
import { cn } from '@/lib/utils'

interface NFTCardProps {
  nft: NFT
  className?: string
}

export function NFTCard({ nft, className }: NFTCardProps) {
  const [imgLoaded, setImgLoaded] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Favoritos exigem autenticação: o visitante vai ao login e volta para cá depois
  // TODO: com a sessão implementada, alternar o favorito via API (atualização otimista)
  function onFavorite() {
    navigate({ to: '/login', search: { redirect: location.href } })
  }

  return (
    <article className={cn('group relative font-mono', className)}>
      {/* Moldura da imagem (258×300 no Figma) */}
      <div className="relative grid aspect-[258/300] place-items-center bg-kurio-surface px-1">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
          {!imgLoaded && <div className="skeleton absolute inset-0 rounded-none" aria-hidden />}
          <img
            src={nft.image}
            alt=""
            width={250}
            height={250}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={cn(
              'size-full object-cover transition duration-500 group-hover:scale-105',
              imgLoaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>

        {/* Favoritar: visível no hover, no foco e quando ativo */}
        <button
          type="button"
          onClick={onFavorite}
          aria-label={`Favoritar ${nft.name} (requer login)`}
          className={cn(
            'absolute top-[8%] right-3 z-10 grid size-9 place-items-center rounded-full bg-kurio-bg/75 backdrop-blur-sm transition-opacity',
            'hover:text-kurio-orange-light focus-visible:opacity-100 group-hover:opacity-100',
            'text-kurio-cream opacity-0',
          )}
        >
          <Heart size={16} aria-hidden />
        </button>
      </div>

      <h3 className="mt-2 truncate text-sm leading-6 sm:text-base">
        {/* Link esticado: o card inteiro leva ao detalhe do NFT */}
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="text-kurio-cream after:absolute after:inset-0 after:content-[''] group-hover:text-kurio-orange-light"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-base leading-7 sm:text-lg">
        <span className="font-bold text-kurio-orange-light">
          <span className="sr-only">Preço: </span>
          {nft.price} ETH
        </span>
        {nft.originalPrice && (
          <span className="text-kurio-muted">
            <span className="sr-only">Preço original: </span>
            {nft.originalPrice} ETH
          </span>
        )}
      </p>
    </article>
  )
}
