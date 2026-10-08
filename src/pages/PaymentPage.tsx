import React from 'react'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, Clock } from 'lucide-react'
import type { Wallet } from '@/types'
import { useCart, useCartQuote } from '@/hooks/useCart'
import { useProfile, useWallets } from '@/hooks/useCheckout'
import { useCheckoutFlow } from '@/hooks/useCheckoutFlow'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CHECKOUT_DRAFT_KEY } from '@/hooks/useAuth'
import {
  validateCheckout,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutForm,
} from '@/lib/checkout'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { CollectorForm } from '@/components/checkout/CollectorForm'
import { ConnectorOptions, OrderSummary, RegisteredWallets } from '@/components/checkout/CheckoutParts'
import { CheckoutDialog } from '@/components/checkout/CheckoutDialog'

const PAGE = 'mx-auto max-w-[1440px] px-5 pt-5 font-mono text-kurio-cream md:px-6 md:pt-7'

/** Ordem de foco quando há erros (mesma ordem visual do formulário) */
const FIELD_ORDER: CheckoutField[] = [
  'displayName', 'username', 'network', 'profileName', 'walletAddress', 'secondary', 'connector',
  'referralCode', 'email', 'ensName', 'note',
]
const COLLECTOR_FIELDS: CheckoutField[] = ['displayName', 'username', 'profileName', 'email', 'ensName', 'referralCode', 'note']

const EMPTY_FORM: CheckoutForm = {
  displayName: '', username: '', profileName: '', email: '', ensName: '', referralCode: '', note: '',
  useOtherWallet: false, walletId: '', network: '', walletAddress: '', secondary: '', connector: '',
}

export function PaymentPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { data: cart, isLoading: cartLoading } = useCart()
  const items = React.useMemo(() => cart?.items ?? [], [cart])
  const quoteQuery = useCartQuote(items.length > 0)
  const { data: profile } = useProfile()
  const { data: wallets = [], isLoading: walletsLoading } = useWallets()

  const [form, setForm] = React.useState<CheckoutForm>(EMPTY_FORM)
  const [errors, setErrors] = React.useState<CheckoutErrors>({})
  const [submitted, setSubmitted] = React.useState(false)
  const [collectorOpen, setCollectorOpen] = React.useState(false)
  const [pageMessage, setPageMessage] = React.useState<string | null>(null)
  const refs = React.useRef<Partial<Record<CheckoutField, HTMLElement | null>>>({})
  const prefilled = React.useRef(false)

  React.useEffect(() => {
    document.title = 'Pagamento — Kurio'
    return () => {
      document.title = 'Kurio — Marketplace de NFTs'
    }
  }, [])

  // Retoma o rascunho (ex.: sessão expirada no meio do checkout) ou pré-preenche
  // com o perfil e a carteira principal; sem carteira cadastrada, informa outra
  React.useEffect(() => {
    if (prefilled.current || !profile || walletsLoading) return
    prefilled.current = true
    try {
      const draft = sessionStorage.getItem(CHECKOUT_DRAFT_KEY)
      if (draft) return setForm({ ...EMPTY_FORM, ...(JSON.parse(draft) as Partial<CheckoutForm>) })
    } catch {
      // rascunho inválido: segue com o perfil
    }
    const primary = wallets.find((w) => w.isPrimary) ?? wallets[0]
    setForm((f) => ({
      ...f,
      ...profile,
      useOtherWallet: !primary,
      walletId: primary?.id ?? '',
      connector: primary?.connector ?? '',
    }))
  }, [profile, wallets, walletsLoading])

  // Rascunho salvo a cada alteração (removido no logout/troca de conta)
  React.useEffect(() => {
    if (!prefilled.current) return
    try {
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(form))
    } catch {
      // ignorado
    }
  }, [form])

  const focusFirstError = React.useCallback((errs: CheckoutErrors) => {
    const first = FIELD_ORDER.find((f) => errs[f])
    if (!first) return
    if (!isDesktop && COLLECTOR_FIELDS.includes(first)) setCollectorOpen(true)
    // aguarda a seção abrir no mobile
    requestAnimationFrame(() => refs.current[first]?.focus())
  }, [isDesktop])

  const flow = useCheckoutFlow({
    form,
    wallets,
    onValidationErrors: (errs) => {
      setSubmitted(true)
      setErrors(errs)
      focusFirstError(errs)
    },
  })

  function onChange<K extends CheckoutField>(field: K, value: CheckoutForm[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'useOtherWallet' && value) Object.assign(next, { network: '', walletAddress: '', secondary: '' })
      if (submitted) setErrors(validateCheckout(next, wallets))
      return next
    })
  }

  function selectWallet(wallet: Wallet) {
    setForm((f) => ({ ...f, useOtherWallet: false, walletId: wallet.id, connector: wallet.connector }))
  }

  async function onConfirmClick() {
    setSubmitted(true)
    setPageMessage(null)
    const errs = validateCheckout(form, wallets)
    setErrors(errs)
    if (Object.keys(errs).length) {
      setPageMessage('Revise os campos destacados para continuar.')
      focusFirstError(errs)
      return
    }
    // Cotação atualizada antes da revisão
    const { data: quote } = await quoteQuery.refetch()
    if (!quote) {
      setPageMessage('Não foi possível calcular o total agora. Tente novamente.')
      return
    }
    if (quote.hasIssues) {
      setPageMessage('Seu carrinho tem alterações de preço ou disponibilidade. Revise o carrinho antes de pagar.')
      return
    }
    flow.startReview(quote)
  }

  const itemNames = React.useMemo(
    () => new Map(items.map((i) => [i.id, `${i.nft.name} (${i.edition.label})`])),
    [items],
  )
  const fieldRef = (field: CheckoutField) => (el: HTMLElement | null) => {
    refs.current[field] = el
  }
  const quote = quoteQuery.data
  const pending = flow.state.phase === 'pending'
  const loading = cartLoading || walletsLoading

  const confirmButton = (
    <button
      type="button"
      onClick={onConfirmClick}
      disabled={!items.length || pending || flow.busy || quoteQuery.isFetching}
      className={cn(
        'w-full font-semibold text-kurio-bg transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        isDesktop
          ? 'mt-6 h-[45px] rounded-lg bg-kurio-orange hover:bg-kurio-orange-hover'
          : 'h-[52px] rounded-full bg-[linear-gradient(90deg,#ce874a_0%,#b87843_100%)]',
      )}
    >
      Confirmar compra
    </button>
  )

  return (
    <div className={PAGE}>
      <div className="mx-auto max-w-[1200px]">
        <MobileHeader />
        <nav aria-label="Trilha de navegação" className="hidden md:block">
          <ol className="flex items-center gap-1.5 text-sm leading-5 font-bold">
            <li><Link to="/" className="hover:text-kurio-orange-light">Início</Link></li>
            <li aria-hidden>/</li>
            <li><Link to="/" hash="catalogo" className="hover:text-kurio-orange-light">Mercado</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page">Pagamento</li>
          </ol>
        </nav>
        <h1 className="sr-only">Pagamento com carteira</h1>

        {pending && !flow.dialogOpen && (
          <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-kurio-orange/60 bg-kurio-orange/10 p-3 text-sm">
            <Clock size={16} aria-hidden className="text-kurio-orange-light" />
            <span className="flex-1">Pedido {flow.state.orderId} aguardando a confirmação da rede.</span>
            <button type="button" onClick={() => flow.setDialogOpen(true)} className="font-semibold text-kurio-orange-light underline underline-offset-2">
              Acompanhar
            </button>
          </div>
        )}

        {loading ? (
          <PaymentSkeleton />
        ) : !items.length && !pending ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-lg font-bold">Seu carrinho está vazio</p>
            <p className="mt-2 text-sm text-kurio-sand">Adicione NFTs ao carrinho para finalizar uma compra.</p>
            <Link to="/" hash="catalogo" className="mt-6 inline-flex h-10 items-center rounded-[4px] bg-kurio-orange px-6 font-semibold text-kurio-bg uppercase hover:bg-kurio-orange-hover">
              Explorar catálogo
            </Link>
          </div>
        ) : isDesktop ? (
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,763px)_405px] lg:justify-between lg:gap-8">
            <section aria-labelledby="collector-title">
              <h2 id="collector-title" className="mb-4 text-[17px] leading-6 font-bold">
                Perfil do colecionador
              </h2>
              <CollectorForm form={form} errors={errors} wallets={wallets} onChange={onChange} fieldRef={fieldRef} />
            </section>

            <div className="lg:-mt-1">
              <OrderSummary items={items} quote={quote} updating={quoteQuery.isFetching} />
              <div className="mt-8">
                <ConnectorOptions value={form.connector} onChange={(c) => onChange('connector', c)} error={errors.connector} variant="desktop" />
              </div>
              {pageMessage && (
                <p role="alert" className="mt-4 text-sm text-[#f4a28c]">
                  {pageMessage}{' '}
                  {pageMessage.includes('carrinho') && (
                    <Link to="/carrinho" className="font-semibold underline">Ir para o carrinho</Link>
                  )}
                </p>
              )}
              {confirmButton}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <RegisteredWallets
              wallets={wallets}
              value={form.useOtherWallet ? '' : form.walletId}
              onChange={selectWallet}
              onUseOther={() => {
                onChange('useOtherWallet', true)
                setCollectorOpen(true)
                requestAnimationFrame(() => refs.current.network?.focus())
              }}
              error={!form.useOtherWallet ? errors.walletAddress : undefined}
            />

            <ConnectorOptions value={form.connector} onChange={(c) => onChange('connector', c)} error={errors.connector} variant="mobile" />

            {/* Dados do colecionador (pré-preenchidos pelo perfil) */}
            <div className="rounded-[14px] bg-kurio-surface">
              <button
                type="button"
                onClick={() => setCollectorOpen((o) => !o)}
                aria-expanded={collectorOpen}
                aria-controls="collector-section"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">Dados do colecionador</span>
                  <span className="block truncate text-[13px] text-kurio-sand">
                    {form.useOtherWallet ? 'Informe a carteira e os seus dados' : `${form.displayName} · ${form.email}`}
                  </span>
                </span>
                <ChevronDown size={18} aria-hidden className={cn('shrink-0 transition-transform', collectorOpen && 'rotate-180')} />
              </button>
              <div id="collector-section" hidden={!collectorOpen} className="border-t border-kurio-line px-4 pt-4 pb-5">
                <CollectorForm form={form} errors={errors} wallets={wallets} onChange={onChange} fieldRef={fieldRef} compact />
              </div>
            </div>

            {/* Total + confirmação presos ao rodapé da tela */}
            <div className="sticky bottom-0 z-30 -mx-5 bg-kurio-bg/95 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] backdrop-blur-sm">
              <p className="mb-4 flex items-baseline justify-end gap-6 font-bold" aria-live="polite">
                <span>Total:</span>
                <span className="text-lg text-kurio-orange-light">{quote ? formatEth(quote.total) : '—'}</span>
              </p>
              {pageMessage && (
                <p role="alert" className="mb-3 text-sm text-[#f4a28c]">
                  {pageMessage}{' '}
                  {pageMessage.includes('carrinho') && (
                    <Link to="/carrinho" className="font-semibold underline">Ir para o carrinho</Link>
                  )}
                </p>
              )}
              {confirmButton}
            </div>
          </div>
        )}
      </div>

      <CheckoutDialog
        open={flow.dialogOpen}
        state={flow.state}
        order={flow.order}
        form={form}
        wallets={wallets}
        session={flow.session}
        itemNames={itemNames}
        onClose={flow.closeDialog}
        onConfirm={flow.confirm}
        onRetry={async () => {
          const { data } = await quoteQuery.refetch()
          flow.retry(data)
        }}
        onDisconnect={flow.disconnectWallet}
      />
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
        onClick={() => (canGoBack ? router.history.back() : navigate({ to: '/carrinho' }))}
        aria-label="Voltar"
        className="absolute left-0 grid size-[30px] place-items-center rounded-full bg-[#2f1d15] transition-colors hover:text-kurio-orange-light"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <p aria-hidden className="text-[17px] font-bold">
        Pagamento com carteira
      </p>
    </div>
  )
}

function PaymentSkeleton() {
  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,763px)_405px] lg:justify-between" role="status" aria-label="Carregando pagamento..." aria-busy="true">
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px] w-full" />
        ))}
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
