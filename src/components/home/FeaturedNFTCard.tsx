import { Link } from '@tanstack/react-router'
import type { NFT } from '@/types'
import { cn } from '@/lib/utils'

interface FeaturedNFTCardProps {
  nft: NFT
  className?: string
}

export function FeaturedNFTCard({ nft, className }: FeaturedNFTCardProps) {
  return (
    <section
      aria-labelledby="featured-nft-heading"
      className={cn(
        'group relative bg-gradient-to-b from-kurio-surface-warm to-kurio-surface font-mono',
        className,
      )}
    >
      <div className="px-5 pt-6 pb-2">
        <h2
          id="featured-nft-heading"
          className="text-2xl leading-8 font-bold uppercase text-kurio-orange-light"
        >
          NFT em destaque
        </h2>
        <p className="mt-2 text-center text-[22px] leading-7 font-bold uppercase text-kurio-cream">
          Oferta limitada
        </p>
      </div>

      <img
        src={nft.image}
        alt=""
        width={310}
        height={366}
        loading="lazy"
        decoding="async"
        className="aspect-[310/366] w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />

      {/* Link cobrindo o card inteiro */}
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Ver NFT em destaque: ${nft.name}, ${nft.price} ETH`}
      />
    </section>
  )
}
