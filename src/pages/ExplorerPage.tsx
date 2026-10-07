import { Link, useParams, useSearch } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { useOrder } from '@/hooks/useCheckout'
import { CONNECTOR_LABELS, NETWORK_LABELS } from '@/lib/checkout'
import { formatEth } from '@/lib/eth'
import { EXPLORERS } from '@/lib/orders'
import { Skeleton } from '@/components/ui/Skeleton'

const STATUS_LABELS = { pending: 'Pendente', confirmed: 'Confirmada', rejected: 'Recusada' } as const

/** Bloco fictício e estável derivado do hash */
const blockFrom = (hash: string) => 19_000_000 + (parseInt(hash.slice(2, 9), 16) % 900_000)

/** Explorador de blocos simulado: os links de exploração são fictícios no ambiente de demonstração */
export function ExplorerPage() {
  const { hash } = useParams({ from: '/explorador/tx/$hash' })
  const { pedido } = useSearch({ from: '/explorador/tx/$hash' })
  const { data: order, isLoading } = useOrder(pedido)
  const found = order && order.transactionRef === hash

  return (
    <section className="mx-auto max-w-[800px] px-5 pt-8 pb-16 font-mono text-kurio-cream md:px-6">
      <p className="flex items-start gap-2 rounded-md border border-kurio-orange/60 bg-kurio-orange/10 p-3 text-sm leading-6">
        <Info size={16} aria-hidden className="mt-1 shrink-0 text-kurio-orange-light" />
        Explorador simulado: esta transação existe apenas no ambiente de demonstração da Kurio.
      </p>

      <h1 className="mt-6 text-2xl font-bold">
        Detalhes da transação{found ? ` · ${EXPLORERS[order.wallet.network]}` : ''}
      </h1>

      {isLoading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : !found ? (
        <p className="mt-4 text-sm text-kurio-sand">Transação não encontrada neste explorador simulado.</p>
      ) : (
        <dl className="mt-6 divide-y divide-kurio-line border-y border-kurio-line text-sm">
          {[
            ['Hash da transação', <span className="break-all">{hash}</span>],
            ['Status', STATUS_LABELS[order.status]],
            ['Rede', NETWORK_LABELS[order.wallet.network]],
            ['Bloco', blockFrom(hash).toLocaleString('pt-BR')],
            ['Data', new Date(order.updatedAt).toLocaleString('pt-BR')],
            ['De', <span className="break-all">{order.wallet.address}</span>],
            ['Carteira', CONNECTOR_LABELS[order.wallet.connector]],
            ['Itens', `${order.items.reduce((sum, i) => sum + i.quantity, 0)} NFTs`],
            ['Valor', formatEth(order.total)],
            ['Taxa de rede', formatEth(order.networkFee)],
          ].map(([label, value]) => (
            <div key={label as string} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
              <dt className="text-kurio-sand">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {pedido && (
        <Link
          to="/pedido/$orderId"
          params={{ orderId: pedido }}
          className="mt-8 inline-flex h-10 items-center rounded-[4px] bg-kurio-orange px-5 font-semibold text-kurio-bg hover:bg-kurio-orange-hover"
        >
          Voltar ao pedido
        </Link>
      )}
    </section>
  )
}
