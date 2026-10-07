import { Link, useParams } from '@tanstack/react-router'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useOrder } from '@/hooks/useCheckout'
import { getErrorStatus } from '@/lib/apiError'
import { CONNECTOR_LABELS, NETWORK_LABELS } from '@/lib/checkout'
import { formatEth } from '@/lib/eth'
import { Skeleton } from '@/components/ui/Skeleton'

const PAGE = 'mx-auto max-w-[800px] px-5 pt-8 pb-16 font-mono text-kurio-cream md:px-6'

/** Estado e recibo do pedido (o recibo usa o snapshot gravado no pedido) */
export function OrderPage() {
  const { orderId } = useParams({ from: '/pedido/$orderId' })
  const { data: order, isLoading, isError, error } = useOrder(orderId)

  if (isLoading) {
    return (
      <div className={PAGE} role="status" aria-label="Carregando pedido...">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <section className={PAGE}>
        <h1 className="text-2xl font-bold">{getErrorStatus(error) === 404 ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
        <Link to="/" className="mt-6 inline-block text-kurio-orange-light underline">Voltar ao início</Link>
      </section>
    )
  }

  if (order.status !== 'confirmed') {
    const pending = order.status === 'pending'
    return (
      <section className={PAGE} aria-live="polite">
        {pending ? (
          <Clock size={36} aria-hidden className="text-kurio-orange-light" />
        ) : (
          <XCircle size={36} aria-hidden className="text-[#f4a28c]" />
        )}
        <h1 className="mt-4 text-2xl font-bold">{pending ? 'Pagamento pendente' : 'Pagamento recusado'}</h1>
        <p className="mt-2 text-sm leading-6 text-kurio-sand">
          {pending
            ? `O pedido ${order.id} aguarda a confirmação da rede. Esta página é atualizada automaticamente.`
            : order.failureReason}
        </p>
        <Link to="/carrinho" className="mt-6 inline-flex h-10 items-center rounded-[4px] bg-kurio-orange px-5 font-semibold text-kurio-bg">
          {pending ? 'Ver carrinho' : 'Voltar ao carrinho'}
        </Link>
      </section>
    )
  }

  return (
    <section className={PAGE} aria-labelledby="order-title">
      <CheckCircle2 size={36} aria-hidden className="text-kurio-orange-light" />
      <h1 id="order-title" className="mt-4 text-2xl font-bold">Pedido confirmado</h1>
      <p className="mt-2 text-sm text-kurio-sand">
        Pedido <strong className="text-kurio-cream">{order.id}</strong> · Transação{' '}
        <span className="break-all">{order.transactionRef}</span>
      </p>

      <ul className="mt-6 divide-y divide-kurio-line border-y border-kurio-line text-sm">
        {order.items.map((item) => (
          <li key={item.itemId} className="flex items-center gap-3 py-3">
            <img src={item.image} alt="" width={48} height={48} className="size-12 object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{item.name}</span>
              <span className="text-kurio-sand">
                {item.tokenId} · {item.editionLabel} · {item.quantity} × {formatEth(item.unitPrice)}
              </span>
            </span>
            <span className="font-bold text-kurio-orange-light">{formatEth(item.total)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEth(order.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>(-) {formatEth(order.discount)}</dd></div>
        <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatEth(order.networkFee)}</dd></div>
        <div className="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd className="text-kurio-orange-light">{formatEth(order.total)}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-kurio-sand">
        Pago com {CONNECTOR_LABELS[order.wallet.connector]} na rede {NETWORK_LABELS[order.wallet.network]}.
      </p>
      <Link to="/" hash="catalogo" className="mt-8 inline-flex h-10 items-center rounded-[4px] bg-kurio-orange px-5 font-semibold text-kurio-bg">
        Continuar explorando
      </Link>
    </section>
  )
}
