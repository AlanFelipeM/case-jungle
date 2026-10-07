import React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Clock, X, XCircle } from 'lucide-react'
import type { Order } from '@/types'
import { useOrder } from '@/hooks/useCheckout'
import { getErrorStatus } from '@/lib/apiError'
import { CONNECTOR_LABELS, NETWORK_LABELS } from '@/lib/checkout'
import { compareEth, formatEth } from '@/lib/eth'
import { EXPLORERS, formatOrderDate, shortHash } from '@/lib/orders'
import { ThankYouIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/Skeleton'

/** Confirmação do pedido: o recibo é o snapshot gravado no pedido e só aparece quando confirmado */
export function OrderPage() {
  const { orderId } = useParams({ from: '/pedido/$orderId' })
  const { data: order, isLoading, isError, error } = useOrder(orderId)

  React.useEffect(() => {
    document.title = 'Confirmação de pedido — Kurio'
    return () => {
      document.title = 'Kurio — Marketplace de NFTs'
    }
  }, [])

  return (
    <div className="flex min-h-screen justify-center bg-kurio-bg px-4 py-8 font-mono text-kurio-cream md:items-start md:py-16">
      <article
        aria-labelledby="order-title"
        aria-live="polite"
        className="relative w-full max-w-[578px] self-start bg-kurio-surface"
      >
        <Link
          to="/"
          aria-label="Fechar e voltar ao início"
          className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-md text-kurio-orange-light transition-colors hover:text-kurio-cream md:top-5 md:right-5"
        >
          <X size={20} aria-hidden />
        </Link>

        {isLoading ? (
          <LoadingState />
        ) : isError || !order ? (
          <MessageState
            icon={<XCircle size={40} aria-hidden className="text-[#f4a28c]" />}
            title={getErrorStatus(error) === 404 ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}
            text="Confira o link ou volte ao início para continuar explorando."
          />
        ) : order.status === 'pending' ? (
          <MessageState
            icon={<Clock size={40} aria-hidden className="text-kurio-orange-light" />}
            title="Pagamento pendente"
            text={`O pedido ${order.id} aguarda a confirmação da rede. Esta página é atualizada automaticamente.`}
          />
        ) : order.status === 'rejected' ? (
          <MessageState
            icon={<XCircle size={40} aria-hidden className="text-[#f4a28c]" />}
            title="Pagamento recusado"
            text={order.failureReason ?? 'O pagamento foi recusado. Nenhum valor foi cobrado.'}
            action={
              <Link to="/carrinho" className="inline-flex h-12 items-center rounded-[4px] bg-kurio-orange px-4 font-bold text-kurio-bg hover:bg-kurio-orange-hover">
                Voltar ao carrinho
              </Link>
            }
          />
        ) : (
          <Receipt order={order} />
        )}

        <div aria-hidden className="h-2.5 bg-kurio-orange" />
      </article>
    </div>
  )
}

function Receipt({ order }: { order: Order }) {
  const network = NETWORK_LABELS[order.wallet.network]
  const explorer = EXPLORERS[order.wallet.network]
  const hasDiscount = compareEth(order.discount, '0') > 0

  return (
    <>
      <header className="flex flex-col items-center border-b border-kurio-orange px-12 pt-6 pb-4 text-center">
        <ThankYouIcon size={80} className="text-kurio-orange" />
        <h1 id="order-title" className="mt-5 text-[15px] leading-6 font-bold text-kurio-sand">
          Seus NFTs agora estão na sua carteira
        </h1>
      </header>

      {/* Resumo da transação */}
      <dl className="grid grid-cols-2 gap-y-3 border-b border-kurio-orange px-5 py-3 text-[13px] leading-[19px] text-kurio-sand sm:px-9 md:grid-cols-[auto_auto_auto_auto] md:justify-between md:gap-y-0">
        <SummaryItem label="ID da transação" value={shortHash(order.transactionRef)} strong title={order.transactionRef} />
        <SummaryItem label="Data" value={formatOrderDate(order.updatedAt)} divider />
        <SummaryItem label="Total" value={formatEth(order.total)} divider className="max-md:border-l-0 max-md:pl-0" />
        <SummaryItem label="Carteira" value={CONNECTOR_LABELS[order.wallet.connector]} strong divider />
      </dl>

      <section aria-labelledby="order-details" className="px-5 pt-7 sm:px-11">
        <h2 id="order-details" className="text-[15px] leading-5 font-bold">
          Detalhes da transação
        </h2>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">NFTs comprados</caption>
          <thead>
            <tr className="text-[15px] leading-5">
              <th scope="col" className="border-b border-kurio-line pt-1 pb-2.5 font-semibold">NFTs</th>
              <th scope="col" className="border-b border-kurio-line pt-1 pb-2.5 text-center font-semibold">Edições</th>
              <th scope="col" className="border-b border-kurio-line pt-1 pb-2.5 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.itemId}>
                <td className="pt-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt=""
                      width={70}
                      height={70}
                      className="size-14 shrink-0 rounded-md object-cover sm:size-[70px]"
                    />
                    <div className="min-w-0">
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: item.nftId }}
                        className="block text-sm leading-5 font-bold hover:text-kurio-orange-light sm:text-[15px] sm:leading-6"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs leading-5 text-kurio-muted sm:text-[13px]">
                        ID do token: {item.tokenId}
                        <span className="sr-only">, edição {item.editionLabel}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="pt-3 text-center text-sm text-kurio-sand">
                  <span aria-hidden>(x {item.quantity})</span>
                  <span className="sr-only">{item.quantity} unidades</span>
                </td>
                <td className="pt-3 text-right text-[15px] font-bold whitespace-nowrap text-kurio-orange-light sm:text-[17px]">
                  {formatEth(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto space-y-2 border-b border-kurio-line pb-2 text-[15px] sm:w-[322px]">
          {hasDiscount && (
            <div className="flex justify-between gap-4">
              <dt>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd>(-) {formatEth(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt>Taxa de rede</dt>
            <dd className="text-base">{formatEth(order.networkFee)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-bold">
            <dt>Total</dt>
            <dd className="text-[17px] text-kurio-orange-light">{formatEth(order.total)}</dd>
          </div>
        </dl>

        <p className="mx-auto mt-4 max-w-[470px] text-center text-[13px] leading-[22px] text-kurio-sand">
          Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada
          na rede.
        </p>

        <div className="flex justify-center pt-5 pb-12">
          <Link
            to="/explorador/tx/$hash"
            params={{ hash: order.transactionRef }}
            search={{ pedido: order.id }}
            className="inline-flex h-12 items-center rounded-[4px] bg-kurio-orange px-4 text-[15px] font-bold text-kurio-bg transition-colors hover:bg-kurio-orange-hover"
          >
            Ver no {explorer}
          </Link>
        </div>
      </section>
    </>
  )
}

function SummaryItem({
  label,
  value,
  strong,
  divider,
  title,
  className = '',
}: {
  label: string
  value: string
  strong?: boolean
  divider?: boolean
  title?: string
  className?: string
}) {
  return (
    <div className={`${divider ? 'border-l border-kurio-orange pl-4' : ''} ${className}`}>
      <dt className={strong ? 'font-bold' : ''}>{label}</dt>
      <dd title={title}>{value}</dd>
    </div>
  )
}

function MessageState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-8 pt-12 pb-14 text-center">
      {icon}
      <h1 id="order-title" className="mt-4 text-lg font-bold">
        {title}
      </h1>
      <p className="mt-2 max-w-[44ch] text-sm leading-6 text-kurio-sand">{text}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {action}
        <Link
          to="/"
          hash="catalogo"
          className="inline-flex h-12 items-center rounded-[4px] border border-kurio-orange px-4 font-bold text-kurio-orange-light hover:bg-kurio-orange hover:text-kurio-bg"
        >
          Continuar explorando
        </Link>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="px-8 pt-8 pb-12" role="status" aria-label="Carregando pedido...">
      <h1 id="order-title" className="sr-only">Carregando pedido</h1>
      <Skeleton className="mx-auto size-16" />
      <Skeleton className="mx-auto mt-5 h-5 w-64" />
      <Skeleton className="mt-8 h-12 w-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px] w-full" />
        ))}
      </div>
    </div>
  )
}
