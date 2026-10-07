import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import type { Order, Wallet, WalletSession } from '@/types'
import type { CheckoutFlowState } from '@/hooks/useCheckoutFlow'
import { CONNECTOR_LABELS, NETWORK_LABELS, resolveWallet, type CheckoutForm } from '@/lib/checkout'
import { formatEth } from '@/lib/eth'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const shortAddress = (address: string) => (address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address)

interface CheckoutDialogProps {
  open: boolean
  state: CheckoutFlowState
  order: Order | undefined
  form: CheckoutForm
  wallets: Wallet[]
  session: WalletSession | null
  /** Nome exibido por item (id do item → "Nome (edição)") */
  itemNames: Map<string, string>
  onClose: () => void
  onConfirm: () => void
  onRetry: () => void
  onDisconnect: () => void
}

const TITLES: Record<CheckoutFlowState['phase'], string> = {
  idle: 'Revisar pedido',
  review: 'Revisar pedido',
  connecting: 'Conectando a carteira',
  submitting: 'Enviando pedido',
  pending: 'Pagamento pendente',
  rejected: 'Pagamento recusado',
  failed: 'Não foi possível concluir',
}

export function CheckoutDialog(props: CheckoutDialogProps) {
  const { open, state, onClose } = props
  const blocking = state.phase === 'connecting' || state.phase === 'submitting'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[calc(100vh-96px)] overflow-y-auto"
        onEscapeKeyDown={(e) => blocking && e.preventDefault()}
        onPointerDownOutside={(e) => blocking && e.preventDefault()}
        onInteractOutside={(e) => blocking && e.preventDefault()}
      >
        <DialogTitle className="pr-10 text-lg font-bold">{TITLES[state.phase]}</DialogTitle>
        <div aria-live="polite">
          {state.phase === 'review' && <Review {...props} />}
          {(state.phase === 'connecting' || state.phase === 'submitting') && <Progress {...props} />}
          {state.phase === 'pending' && <Pending {...props} />}
          {state.phase === 'rejected' && <Rejected {...props} />}
          {state.phase === 'failed' && <Failed {...props} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Review({ state, form, wallets, session, itemNames, onConfirm, onClose, onDisconnect }: CheckoutDialogProps) {
  const quote = state.quote
  if (!quote) return null
  const wallet = resolveWallet(form, wallets)
  const registered = wallets.find((w) => w.id === form.walletId && !form.useOtherWallet)
  const connector = form.connector ? CONNECTOR_LABELS[form.connector] : ''
  const connected = session && session.address === wallet.address && session.connector === form.connector

  return (
    <>
      <DialogDescription className="mt-1 text-sm text-kurio-sand">
        Confira os dados antes de confirmar a compra.
      </DialogDescription>

      {state.message && (
        <div role="alert" className="mt-4 flex gap-2 rounded-md border border-kurio-orange/60 bg-kurio-orange/10 p-3 text-sm">
          <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-kurio-orange-light" />
          <p>
            {state.message}
            {state.previousTotal && (
              <>
                {' '}
                Total anterior: {formatEth(state.previousTotal)}; total atual:{' '}
                <strong className="text-kurio-orange-light">{formatEth(quote.total)}</strong>.
              </>
            )}
          </p>
        </div>
      )}

      <h3 className="mt-5 text-sm font-semibold">Itens</h3>
      <ul className="mt-2 divide-y divide-kurio-line text-sm">
        {quote.lines.map((line) => (
          <li key={line.itemId} className="flex justify-between gap-3 py-2">
            <span className="min-w-0 truncate">
              {itemNames.get(line.itemId) ?? line.itemId} · {line.quantity} × {formatEth(line.unitPrice)}
            </span>
            <span className="shrink-0 font-semibold">{formatEth(line.total)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 space-y-1.5 border-t border-kurio-line pt-3 text-sm">
        <Row label="Subtotal" value={formatEth(quote.subtotal)} />
        <Row label={quote.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto'} value={`(-) ${formatEth(quote.discount)}`} />
        <Row label="Taxa de rede (estimada)" value={formatEth(quote.networkFee)} />
        <div className="flex justify-between pt-1 text-base font-bold">
          <dt>Total</dt>
          <dd className="text-kurio-orange-light">{formatEth(quote.total)}</dd>
        </div>
      </dl>

      <dl className="mt-4 grid gap-3 rounded-md bg-kurio-bg/60 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-kurio-sand">Colecionador</dt>
          <dd>{form.displayName}</dd>
          <dd className="text-kurio-sand">{form.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-kurio-sand">Carteira e rede</dt>
          <dd>
            {registered ? `${registered.label} · ` : ''}
            {registered?.ens ?? shortAddress(wallet.address)}
          </dd>
          <dd className="text-kurio-sand">
            {wallet.network ? NETWORK_LABELS[wallet.network] : ''} · {connector}
          </dd>
        </div>
      </dl>

      {connected && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-kurio-sand">
          <CheckCircle2 size={14} aria-hidden className="text-kurio-orange-light" />
          {connector} conectada.
          <button type="button" onClick={onDisconnect} className="underline underline-offset-2 hover:text-kurio-cream">
            Desconectar
          </button>
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[4px] border border-kurio-orange px-4 text-sm font-semibold text-kurio-orange-light hover:bg-kurio-orange hover:text-kurio-bg"
        >
          Voltar e editar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 rounded-[4px] bg-kurio-orange px-5 text-sm font-semibold text-kurio-bg hover:bg-kurio-orange-hover"
        >
          {connected ? 'Confirmar e pagar' : `Conectar ${connector} e pagar`}
        </button>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-kurio-sand">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function Progress({ state, form }: CheckoutDialogProps) {
  const connector = form.connector ? CONNECTOR_LABELS[form.connector] : 'carteira'
  return (
    <div className="flex flex-col items-center py-8 text-center" role="status">
      <Loader2 size={32} aria-hidden className="animate-spin text-kurio-orange-light motion-reduce:animate-none" />
      <p className="mt-4 text-sm">
        {state.phase === 'connecting'
          ? `Aguardando a aprovação na ${connector}…`
          : 'Enviando o pedido e revalidando preços e disponibilidade…'}
      </p>
    </div>
  )
}

function Pending({ state, order, onClose }: CheckoutDialogProps) {
  return (
    <div className="py-4 text-center">
      <Clock size={32} aria-hidden className="mx-auto text-kurio-orange-light" />
      <DialogDescription className="mt-4 text-sm leading-6">
        Aguardando a confirmação da rede. Você pode fechar esta janela: o status do pedido é atualizado
        automaticamente, inclusive se você recarregar a página.
      </DialogDescription>
      <p className="mt-3 text-xs text-kurio-sand">
        Pedido {state.orderId}
        {order && <> · Transação {order.transactionRef.slice(0, 10)}…</>}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 h-10 rounded-[4px] border border-kurio-orange px-4 text-sm font-semibold text-kurio-orange-light hover:bg-kurio-orange hover:text-kurio-bg"
      >
        Acompanhar depois
      </button>
    </div>
  )
}

function Rejected({ state, onRetry }: CheckoutDialogProps) {
  return (
    <div className="py-4 text-center">
      <XCircle size={32} aria-hidden className="mx-auto text-[#f4a28c]" />
      <DialogDescription className="mt-4 text-sm leading-6">
        {state.message ?? 'O pagamento foi recusado. Nenhum valor foi cobrado e seus itens continuam no carrinho.'}
      </DialogDescription>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/carrinho"
          className="inline-flex h-10 items-center justify-center rounded-[4px] border border-kurio-orange px-4 text-sm font-semibold text-kurio-orange-light hover:bg-kurio-orange hover:text-kurio-bg"
        >
          Voltar ao carrinho
        </Link>
        <button
          type="button"
          onClick={onRetry}
          className="h-10 rounded-[4px] bg-kurio-orange px-5 text-sm font-semibold text-kurio-bg hover:bg-kurio-orange-hover"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

function Failed({ state, onRetry, onClose }: CheckoutDialogProps) {
  return (
    <div className="py-4 text-center" role="alert">
      <AlertTriangle size={32} aria-hidden className="mx-auto text-[#f4a28c]" />
      <p className="mt-4 text-sm leading-6">{state.message}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[4px] border border-kurio-orange px-4 text-sm font-semibold text-kurio-orange-light hover:bg-kurio-orange hover:text-kurio-bg"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="h-10 rounded-[4px] bg-kurio-orange px-5 text-sm font-semibold text-kurio-bg hover:bg-kurio-orange-hover"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
