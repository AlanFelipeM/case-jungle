import React from 'react'
import { Link, useCanGoBack, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Heart, Mail, RefreshCw, Star, X } from 'lucide-react'
import type { NFT } from '@/types'
import { useNFT } from '@/hooks/useNFTs'
import { useFavorite } from '@/hooks/useFavorites'
import { useAuthPrompt } from '@/components/auth/authContext'
import { getErrorStatus } from '@/lib/apiError'
import { LinkedinIcon, XIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/Skeleton'
import { NftGallery } from '@/components/nft/NftGallery'
import { PurchasePanel } from '@/components/nft/PurchasePanel'
import { NftTabs, type NftTab } from '@/components/nft/NftTabs'
import { MoreFromCollection } from '@/components/nft/MoreFromCollection'
import { RatingStars } from '@/components/nft/RatingStars'

const PAGE = 'mx-auto max-w-[1440px] px-5 pt-6 font-mono text-kurio-cream md:px-6 md:pt-7'

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const { data: nft, isLoading, isError, error, refetch } = useNFT(nftId)

  React.useEffect(() => {
    if (nft) document.title = `${nft.name} — Kurio`
    return () => {
      document.title = 'Kurio — Marketplace de NFTs'
    }
  }, [nft])

  if (isLoading) return <NftDetailSkeleton />

  if (isError || !nft) {
    const notFound = getErrorStatus(error) === 404
    return (
      <section className={`${PAGE} flex min-h-[60vh] max-w-[1200px] flex-col items-start justify-center pb-16`}>
        <p className="text-sm tracking-[0.1em] text-kurio-orange-light uppercase">
          {notFound ? 'Erro 404' : 'Falha ao carregar'}
        </p>
        <h1 className="mt-3 text-[28px] leading-[1.4] font-bold uppercase sm:text-4xl">
          {notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}
        </h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-6 text-kurio-sand">
          {notFound
            ? 'Este NFT não existe ou foi removido do marketplace. Explore o catálogo para descobrir outras obras.'
            : 'Verifique sua conexão e tente novamente.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {!notFound && (
            <button
              type="button"
              onClick={() => refetch()}
              className="h-10 rounded-[4px] bg-kurio-orange px-6 font-semibold text-kurio-bg uppercase transition-colors hover:bg-kurio-orange-hover"
            >
              Tentar novamente
            </button>
          )}
          <Link
            to="/"
            hash="catalogo"
            className="inline-flex h-10 items-center rounded-[4px] border border-kurio-orange px-6 font-semibold text-kurio-orange-light uppercase transition-colors hover:bg-kurio-orange hover:text-kurio-bg"
          >
            Ver catálogo
          </Link>
        </div>
      </section>
    )
  }

  // key: ao navegar para outro NFT, seleção de edição/quantidade/aba recomeça
  return <NftDetail key={nft.id} nft={nft} />
}

function NftDetail({ nft }: { nft: NFT }) {
  const [tab, setTab] = React.useState<NftTab>('details')
  const tabsRef = React.useRef<HTMLDivElement>(null)

  function showReviews() {
    setTab('reviews')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    tabsRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }

  const attributes = nft.attributes.map((a) => a.value).join(', ')
  const liveNotice = useLiveUpdateNotice(nft)

  return (
    <div className={`${PAGE} max-md:bg-[#281813]`}>
      <div className="mx-auto max-w-[1200px]">
        <MobileTopBar nft={nft} />
        <div className="hidden md:block">
          <Breadcrumb />
        </div>

        <div className="mt-2 grid md:mt-3 md:gap-8 lg:grid-cols-[572px_1fr] lg:gap-[33px]">
          <NftGallery nft={nft} />

          {/* Mobile: painel que sobe sobre a imagem */}
          <div className="relative min-w-0 max-md:-mx-5 max-md:-mt-9 max-md:rounded-t-[28px] max-md:bg-kurio-surface max-md:px-5 max-md:pt-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-[17px] leading-7 font-bold md:text-[28px] md:leading-9">{nft.name}</h1>
              <button
                type="button"
                onClick={showReviews}
                aria-label={`Avaliação ${nft.rating.toLocaleString('pt-BR')} de 5, ${nft.reviewCount} avaliações. Ver avaliações`}
                className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-kurio-orange px-2 text-xs md:hidden"
              >
                <Star size={12} fill="currentColor" aria-hidden className="text-kurio-orange" />
                {nft.rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                <span className="text-kurio-sand">({nft.reviewCount})</span>
              </button>
            </div>
            {liveNotice.message && (
              <div
                role="status"
                className="mt-3 flex items-start gap-2 rounded-md border border-kurio-orange/60 bg-kurio-orange/10 px-3 py-2 text-[13px] leading-5"
              >
                <RefreshCw size={14} aria-hidden className="mt-0.5 shrink-0 text-kurio-orange-light" />
                <p className="flex-1">{liveNotice.message}</p>
                <button
                  type="button"
                  onClick={liveNotice.dismiss}
                  aria-label="Fechar aviso"
                  className="-my-1 -mr-1 grid size-7 shrink-0 place-items-center rounded transition-colors hover:text-kurio-orange-light"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            )}
            <div className="mt-2 hidden flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-kurio-line pb-1.5 md:flex">
              <p className="text-[22px] leading-[30px] font-bold text-kurio-orange-light">
                <span className="sr-only">Preço: </span>
                {nft.price} ETH
                {nft.originalPrice && (
                  <span className="ml-3 text-base font-normal text-kurio-muted">
                    <span className="sr-only">Preço original: </span>
                    {nft.originalPrice} ETH
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={showReviews}
                className="flex items-center gap-1.5 text-sm transition-colors hover:text-kurio-orange-light"
              >
                <RatingStars rating={nft.rating} />
                {nft.reviewCount} avaliações<span className="hidden sm:inline"> de colecionadores</span>
              </button>
            </div>

            <h2 className="sr-only md:not-sr-only md:mt-3 md:block md:text-[15px] md:leading-5 md:font-semibold">
              Sobre este NFT:
            </h2>
            <p className="mt-3 text-[13px] leading-[1.75] text-kurio-sand md:mt-2 md:text-sm md:leading-6">
              {nft.description}
            </p>

            <div className="mt-3 md:mt-1.5">
              <PurchasePanel nft={nft} />
            </div>

            <dl className="mt-4 space-y-2 text-[13px] leading-7 text-kurio-sand md:space-y-3 md:text-[15px] md:leading-5">
              <div>
                <dt className="inline">ID do token: </dt>
                <dd className="inline">{nft.tokenId}</dd>
              </div>
              <div>
                <dt className="inline">Coleção: </dt>
                <dd className="inline">{nft.collectionName}</dd>
              </div>
              {attributes && (
                <div>
                  <dt className="inline">Atributos: </dt>
                  <dd className="inline">{attributes}</dd>
                </div>
              )}
            </dl>

            <div className="hidden md:block">
              <ShareLinks nft={nft} />
            </div>
          </div>
        </div>

        {/* Mobile: o painel continua até o fim do conteúdo */}
        <div className="max-md:-mx-5 max-md:bg-kurio-surface max-md:px-5 max-md:pb-10">
          <div className="pt-10 md:mt-16 md:pt-0 lg:mt-[94px]">
            <NftTabs ref={tabsRef} nft={nft} active={tab} onChange={setTab} />
          </div>

          <MoreFromCollection nft={nft} />
        </div>
      </div>
    </div>
  )
}

/** Aviso quando preço ou disponibilidade mudam enquanto a página está aberta (Socket.IO) */
function useLiveUpdateNotice(nft: NFT) {
  const previous = React.useRef(nft)
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const before = previous.current
    previous.current = nft
    if (nft.version <= before.version) return
    const parts: string[] = []
    if (nft.price !== before.price) parts.push(`Preço atualizado: ${before.price} → ${nft.price} ETH.`)
    const availabilityChanged = nft.editions.some(
      (e, i) => e.available !== before.editions[i]?.available,
    )
    if (availabilityChanged) parts.push('Disponibilidade das edições atualizada.')
    if (parts.length) setMessage(parts.join(' '))
  }, [nft])

  return { message, dismiss: () => setMessage(null) }
}

function MobileTopBar({ nft }: { nft: NFT }) {
  const { openAuth } = useAuthPrompt()
  const favorite = useFavorite(nft, () => openAuth())
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const button =
    'grid size-[30px] place-items-center rounded-full bg-[#2f1d15] transition-colors hover:text-kurio-orange-light'

  return (
    <div className="flex items-center justify-between md:hidden">
      <button
        type="button"
        onClick={() => (canGoBack ? router.history.back() : navigate({ to: '/', hash: 'catalogo' }))}
        aria-label="Voltar"
        className={button}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <button
        type="button"
        onClick={favorite.toggle}
        aria-label={favorite.label}
        aria-pressed={favorite.isFavorite}
        className={`${button} ${favorite.isFavorite ? 'text-kurio-orange-light' : 'text-kurio-sand'}`}
      >
        <Heart size={15} aria-hidden fill={favorite.isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

function Breadcrumb() {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="flex items-center gap-1.5 text-sm leading-5 font-bold">
        <li>
          <Link to="/" className="transition-colors hover:text-kurio-orange-light">
            Início
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link to="/" hash="catalogo" className="transition-colors hover:text-kurio-orange-light">
            Mercado
          </Link>
        </li>
      </ol>
    </nav>
  )
}

function ShareLinks({ nft }: { nft: NFT }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = `${nft.name} na Kurio`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: <LinkedinIcon size={18} viewBox="8 8 18 18" />,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: <Mail size={17} aria-hidden />,
    },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: <XIcon size={18} viewBox="8 8 18 18" />,
    },
  ]

  return (
    <div className="mt-3 flex items-center gap-2">
      <p className="text-[15px] leading-5 font-semibold">Compartilhar este NFT:</p>
      <ul className="flex items-center">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={link.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
              aria-label={`Compartilhar por ${link.label}`}
              className="grid size-7 place-items-center rounded-md transition-colors hover:text-kurio-orange-light"
            >
              {link.icon}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NftDetailSkeleton() {
  return (
    <div className={PAGE} role="status" aria-label="Carregando NFT..." aria-busy="true">
      <div className="mx-auto max-w-[1200px]">
        <Skeleton className="h-5 w-36" />
        <div className="mt-3 grid gap-8 lg:grid-cols-[572px_1fr] lg:gap-[33px]">
          <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-7">
            <div className="grid grid-cols-4 gap-3 lg:flex lg:w-[100px] lg:flex-col lg:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton aspect-square w-full rounded-lg" />
              ))}
            </div>
            <div className="bg-kurio-surface p-4 sm:p-5 lg:size-[444px]">
              <div className="skeleton aspect-square rounded-3xl" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}
