import React from 'react'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import type { CartItem, Quote, QuoteLine } from '@/types'
import { useCart, useCartItemMutation, useCartQuote, useConfirmPrices } from '@/hooks/useCart'
import { useNFTs } from '@/hooks/useNFTs'
import { getErrorMessage } from '@/lib/apiError'
import { formatEth } from '@/lib/eth'
import { Skeleton } from '@/components/ui/Skeleton'
import { CartCards, CartTable } from '@/components/cart/CartItems'
import { CartSummary } from '@/components/cart/CartSummary'
import { NftCarousel } from '@/components/nft/NftCarousel'
import { useSession } from '@/hooks/useAuth'
import { useAuthPrompt } from '@/components/auth/authContext'

const PAGE = 'mx-auto max-w-[1440px] px-5 pt-5 font-mono text-kurio-cream md:px-6 md:pt-7'

export function CartPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading, isError, refetch } = useCart()
  const items = cart?.items ?? []
  const quoteQuery = useCartQuote(items.length > 0)
  const quote = items.length > 0 ? quoteQuery.data : undefined
  const itemMutation = useCartItemMutation()
  const { isAuthenticated } = useSession()
  const { openAuth } = useAuthPrompt()

  React.useEffect(() => {
    document.title = 'Carrinho — Kurio'
    return () => {
      document.title = 'Kurio — Marketplace de NFTs'
    }
  }, [])

  const lines = React.useMemo(() => new Map((quote?.lines ?? []).map((l) => [l.itemId, l])), [quote])
  const actions = {
    onQuantityChange: (item: CartItem, quantity: number) => itemMutation.mutate({ itemId: item.id, quantity }),
    onRemove: (item: CartItem) => itemMutation.mutate({ itemId: item.id, remove: true }),
  }

  const updating = quoteQuery.isFetching || itemMutation.isPending
  const checkoutHint = !items.length
    ? undefined
    : quote?.hasIssues
      ? 'Revise as alterações do carrinho para continuar.'
      : undefined
  const checkoutDisabled = !items.length || !quote || quote.hasIssues || updating

  const summaryProps = {
    quote,
    updating,
    checkoutDisabled,
    checkoutHint,
    // Pagamento exige login: sem sessão, entra e segue para o pagamento
    onCheckout: () => (isAuthenticated ? navigate({ to: '/pagamento' }) : openAuth({ redirect: '/pagamento' })),
  }

  return (
    <div className={PAGE}>
      <div className="mx-auto max-w-[1200px]">
        <MobileHeader />
        <nav aria-label="Trilha de navegação" className="hidden md:block">
          <ol className="flex items-center gap-1.5 text-sm leading-5 font-bold">
            <li>
              <Link to="/" className="hover:text-kurio-orange-light">Início</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-kurio-orange-light">Mercado</Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">Carrinho</li>
          </ol>
        </nav>
        <h1 className="sr-only">Carrinho de NFTs</h1>

        {isLoading ? (
          <CartSkeleton />
        ) : isError ? (
          <div role="alert" className="py-16 text-center">
            <p className="text-lg">Não foi possível carregar o carrinho.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-6 h-10 rounded-[4px] bg-kurio-orange px-6 font-semibold text-kurio-bg hover:bg-kurio-orange-hover"
            >
              Tentar novamente
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-10 md:mt-0 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between lg:gap-12">
            <div className="min-w-0">
              <CartChanges quote={quote} items={items} />
              {itemMutation.isError && (
                <p role="alert" className="mb-3 rounded-md border border-[#f4a28c]/50 px-3 py-2 text-sm text-[#f4a28c]">
                  {getErrorMessage(itemMutation.error, 'Não foi possível atualizar o carrinho.')} A alteração foi desfeita.
                </p>
              )}
              <CartTable items={items} lines={lines} {...actions} />
              <CartCards items={items} {...actions} />
            </div>

            {/* Desktop/tablet: painel lateral */}
            <aside aria-labelledby="cart-summary-title" className="hidden md:block lg:sticky lg:top-24 lg:self-start lg:pt-3">
              <h2 id="cart-summary-title" className="border-b border-kurio-line pb-2.5 text-[17px] leading-6 font-bold">
                Resumo da carteira
              </h2>
              <div className="mt-6">
                <CartSummary {...summaryProps} variant="panel" />
              </div>
            </aside>

            {/* Mobile: resumo preso ao rodapé da tela enquanto a lista rola */}
            <aside
              aria-label="Resumo do pedido"
              className="sticky bottom-0 z-30 -mx-5 rounded-t-[28px] bg-kurio-surface px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] md:hidden"
            >
              <CartSummary {...summaryProps} variant="sheet" />
            </aside>
          </div>
        )}

        <AlsoViewed excludeIds={items.map((i) => i.nftId)} />
      </div>
    </div>
  )
}

/** Alterações de preço/disponibilidade recebidas com o carrinho aberto */
function CartChanges({ quote, items }: { quote: Quote | undefined; items: CartItem[] }) {
  const confirm = useConfirmPrices()
  if (!quote?.hasIssues) return null

  const name = (line: QuoteLine) => {
    const item = items.find((i) => i.id === line.itemId)
    return item ? `${item.nft.name} (${item.edition.label})` : line.itemId
  }
  const priceChanges = quote.lines.filter((l) => l.priceChanged)
  const availabilityIssues = quote.lines.filter((l) => l.exceedsAvailability)

  return (
    <div role="alert" className="mb-4 rounded-md border border-kurio-orange/60 bg-kurio-orange/10 p-4 text-sm leading-6">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} aria-hidden className="text-kurio-orange-light" />
        Seu carrinho foi atualizado
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-kurio-sand">
        {priceChanges.map((line) => (
          <li key={`price-${line.itemId}`}>
            {name(line)}: preço alterado de {formatEth(line.previousPrice)} para{' '}
            <strong className="text-kurio-cream">{formatEth(line.unitPrice)}</strong>.
          </li>
        ))}
        {availabilityIssues.map((line) => (
          <li key={`stock-${line.itemId}`}>
            {name(line)}:{' '}
            {line.available === 0
              ? 'edição esgotada. Remova o item para continuar.'
              : `restam ${line.available} ${line.available === 1 ? 'unidade' : 'unidades'}. Ajuste a quantidade.`}
          </li>
        ))}
      </ul>
      {priceChanges.length > 0 && (
        <button
          type="button"
          onClick={() => confirm.mutate()}
          disabled={confirm.isPending}
          className="mt-3 h-9 rounded-[4px] bg-kurio-orange px-4 font-semibold text-kurio-bg hover:bg-kurio-orange-hover disabled:opacity-60"
        >
          {confirm.isPending ? 'Confirmando…' : 'Confirmar novos preços'}
        </button>
      )}
      {confirm.isError && (
        <p className="mt-2 text-[#f4a28c]">{getErrorMessage(confirm.error, 'Não foi possível confirmar os preços.')}</p>
      )}
    </div>
  )
}

function MobileHeader() {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  return (
    <div className="relative flex h-9 items-center justify-center md:hidden">
      <button
        type="button"
        onClick={() => (canGoBack ? router.history.back() : navigate({ to: '/' }))}
        aria-label="Voltar"
        className="absolute left-0 grid size-[30px] place-items-center rounded-full bg-[#2f1d15] transition-colors hover:text-kurio-orange-light"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <p aria-hidden className="text-[17px] font-bold">
        Carrinho de NFTs
      </p>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center py-16 text-center md:py-24">
      <p className="text-lg font-bold">Seu carrinho está vazio</p>
      <p className="mt-2 max-w-[44ch] text-sm leading-6 text-kurio-sand">
        Explore o catálogo e adicione NFTs para vê-los aqui.
      </p>
      <Link
        to="/"
        hash="catalogo"
        className="mt-6 inline-flex h-10 items-center rounded-[4px] bg-kurio-orange px-6 font-semibold text-kurio-bg uppercase hover:bg-kurio-orange-hover"
      >
        Explorar catálogo
      </Link>
    </div>
  )
}

function AlsoViewed({ excludeIds }: { excludeIds: string[] }) {
  const { data, isLoading, isError } = useNFTs({ sort: 'popular', tab: 'all', page: 1, limit: 20 })
  const exclude = excludeIds.join(',')
  const items = React.useMemo(
    () => (data?.data ?? []).filter((nft) => !exclude.split(',').includes(nft.id)).slice(0, 15),
    [data, exclude],
  )
  if (isError) return null
  return <NftCarousel title="Colecionadores também viram" items={items} isLoading={isLoading} />
}

function CartSkeleton() {
  return (
    <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between" role="status" aria-label="Carregando carrinho..." aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-7 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] w-full rounded-[14px] md:h-[70px] md:rounded-none" />
        ))}
      </div>
      <div className="hidden space-y-4 md:block">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
