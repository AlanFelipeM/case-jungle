import React from 'react'
import type { NFT } from '@/types'
import { useNFTReviews } from '@/hooks/useNFTs'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { RatingStars } from './RatingStars'

export type NftTab = 'details' | 'reviews'

const NETWORK_LABELS: Record<NFT['network'], string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

interface NftTabsProps {
  nft: NFT
  active: NftTab
  onChange: (tab: NftTab) => void
}

export const NftTabs = React.forwardRef<HTMLDivElement, NftTabsProps>(function NftTabs(
  { nft, active, onChange },
  ref,
) {
  const tabs: { id: NftTab; label: React.ReactNode }[] = [
    { id: 'details', label: 'Detalhes do NFT' },
    {
      id: 'reviews',
      label: (
        <>
          Avaliações<span className="hidden sm:inline"> de colecionadores</span> ({nft.reviewCount})
        </>
      ),
    },
  ]
  const tabRefs = React.useRef<Record<NftTab, HTMLButtonElement | null>>({ details: null, reviews: null })

  function onKeyDown(event: React.KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = active === 'details' ? 'reviews' : 'details'
    const target = event.key === 'Home' ? 'details' : event.key === 'End' ? 'reviews' : next
    onChange(target)
    tabRefs.current[target]?.focus()
  }

  return (
    <div ref={ref} className="scroll-mt-24">
      <div role="tablist" aria-label="Informações do NFT" className="flex gap-8 overflow-x-auto border-b border-kurio-line">
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el
              }}
              type="button"
              role="tab"
              id={`nft-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`nft-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={onKeyDown}
              className={cn(
                'relative shrink-0 pb-2 text-base leading-6 whitespace-nowrap transition-colors sm:text-[17px]',
                selected ? 'font-bold text-kurio-orange-light' : 'hover:text-kurio-orange-light',
              )}
            >
              {tab.label}
              {selected && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] bg-kurio-orange" />}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`nft-panel-${active}`}
        aria-labelledby={`nft-tab-${active}`}
        tabIndex={0}
        className="mt-3 text-sm leading-6 focus-visible:outline-offset-4"
      >
        {active === 'details' ? <DetailsPanel nft={nft} /> : <ReviewsPanel nft={nft} />}
      </div>
    </div>
  )
})

function DetailsPanel({ nft }: { nft: NFT }) {
  const network = NETWORK_LABELS[nft.network]
  return (
    <div className="text-kurio-sand">
      {nft.story.map((paragraph, i) => (
        <p key={i} className={cn(i > 0 && 'mt-6')}>
          {paragraph}
        </p>
      ))}
      <dl>
        <dt className="mt-3 font-semibold text-kurio-cream">Rede:</dt>
        <dd>Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.</dd>
        <dt className="mt-3 font-semibold text-kurio-cream">Contrato:</dt>
        <dd>
          <span title={nft.contractAddress}>{shortAddress(nft.contractAddress)}</span> • Contrato inteligente
          ERC-721 verificado.
        </dd>
        <dt className="mt-3 font-semibold text-kurio-cream">Direitos autorais:</dt>
        <dd>
          Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos
          mercados compatíveis.
        </dd>
      </dl>
    </div>
  )
}

function ReviewsPanel({ nft }: { nft: NFT }) {
  const { data, isLoading, isError, refetch } = useNFTReviews(nft.id)

  if (isLoading) {
    return (
      <div role="status" aria-label="Carregando avaliações..." className="space-y-5 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full max-w-[560px]" />
          </div>
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div role="alert" className="py-6 text-kurio-sand">
        Não foi possível carregar as avaliações.{' '}
        <button type="button" onClick={() => refetch()} className="font-semibold text-kurio-orange-light underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (data.items.length === 0) {
    return <p className="py-6 text-kurio-sand">Este NFT ainda não recebeu avaliações.</p>
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-kurio-cream">
        <RatingStars rating={data.average} />
        <span>
          {data.average.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} de 5 · {data.total} avaliações
        </span>
      </p>
      <ul className="mt-4 divide-y divide-kurio-line">
        {data.items.map((review) => (
          <li key={review.id} className="py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-kurio-cream">{review.author}</span>
              <RatingStars rating={review.rating} size={12} />
              <time dateTime={review.date} className="text-xs text-kurio-sand">
                {new Date(review.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
            </div>
            <p className="mt-1 text-kurio-sand">{review.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
