import React from 'react'
import { Link } from '@tanstack/react-router'
import { MoreVertical, Wallet as WalletIcon } from 'lucide-react'
import type { CartItem, Quote, Wallet, WalletConnector } from '@/types'
import { CONNECTOR_LABELS, NETWORK_LABELS } from '@/lib/checkout'
import { formatEth, mulEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { CouponForm } from '@/components/cart/CartSummary'

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

// ─── Resumo do pedido (desktop) ────────────────────────────────────────────

export function OrderSummary({ items, quote, updating }: { items: CartItem[]; quote: Quote | undefined; updating: boolean }) {
  const [couponOpen, setCouponOpen] = React.useState(false)
  const lines = new Map((quote?.lines ?? []).map((l) => [l.itemId, l]))

  return (
    <section aria-labelledby="order-summary-title" className="font-mono">
      <h2 id="order-summary-title" className="text-[17px] leading-6 font-bold">
        Seus NFTs
      </h2>
      <div className="mt-2 flex justify-between border-b border-kurio-line pb-2 text-[15px]" aria-hidden>
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 bg-kurio-surface pr-4">
            <img src={item.nft.image} alt="" width={70} height={70} loading="lazy" className="size-[70px] shrink-0 object-cover" />
            <div className="min-w-0 flex-1 py-2">
              <p className="truncate text-[15px] leading-6 font-bold">{item.nft.name}</p>
              <p className="truncate text-[13px] leading-5 text-kurio-muted">
                ID do token: {item.nft.tokenId}
              </p>
            </div>
            <span className="shrink-0 text-sm text-kurio-sand">
              <span className="sr-only">Quantidade: </span>
              <span aria-hidden>(x {item.quantity})</span>
              <span className="sr-only">{item.quantity}</span>
            </span>
            <span className="w-[92px] shrink-0 text-right text-[17px] font-bold text-kurio-orange-light">
              {formatEth(lines.get(item.id)?.total ?? mulEth(item.nft.price, item.quantity))}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {quote?.coupon || couponOpen ? (
          <CouponForm quote={quote} sheet={false} />
        ) : (
          <p className="text-center text-sm">
            Tem um código promocional?{' '}
            <button type="button" onClick={() => setCouponOpen(true)} className="underline-offset-2 hover:text-kurio-orange-light hover:underline">
              Aplique aqui
            </button>
          </p>
        )}
      </div>

      <dl aria-busy={updating} className={cn('mt-3 space-y-3 text-[15px] transition-opacity', updating && 'opacity-60')}>
        <SummaryRow label="Subtotal" value={quote ? formatEth(quote.subtotal) : '—'} />
        <SummaryRow
          label={quote?.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'}
          value={quote ? `(-) ${formatEth(quote.discount)}` : '—'}
        />
        <div>
          <SummaryRow label="Taxa de rede" value={quote ? formatEth(quote.networkFee) : '—'} />
          <p className="mt-1 text-center text-[11px] text-kurio-orange-light">Taxa estimada</p>
        </div>
        <div className="flex items-baseline justify-between border-t border-kurio-line px-10 pt-3 font-bold">
          <dt className="text-base">Total</dt>
          <dd className="text-lg text-kurio-orange-light">{quote ? formatEth(quote.total) : '—'}</dd>
        </div>
      </dl>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

// ─── Carteira e rede (conectores) ──────────────────────────────────────────

const CONNECTOR_INITIAL: Record<WalletConnector, string> = { walletconnect: 'W', metamask: 'M', coinbase: 'C' }

export function ConnectorOptions({
  value,
  onChange,
  error,
  variant,
}: {
  value: WalletConnector | ''
  onChange: (connector: WalletConnector) => void
  error?: string
  variant: 'desktop' | 'mobile'
}) {
  const name = React.useId()
  const options: WalletConnector[] = ['walletconnect', 'metamask', 'coinbase']
  const mobile = variant === 'mobile'

  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} className="font-mono">
      <legend className={cn('w-full font-bold', mobile ? 'mb-3 text-base' : 'mb-4 text-center text-[17px]')}>
        Carteira e rede
      </legend>
      <div className={cn(mobile ? 'space-y-3' : 'space-y-4')}>
        {options.map((connector) => {
          const checked = value === connector
          return (
            <label
              key={connector}
              className={cn(
                'flex cursor-pointer items-center gap-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-kurio-orange',
                mobile
                  ? 'h-[60px] rounded-[14px] bg-kurio-surface px-3'
                  : cn('h-[45px] border px-3', checked ? 'border-kurio-orange' : 'border-[#3f2319] hover:border-kurio-sand'),
              )}
            >
              <input
                type="radio"
                name={name}
                value={connector}
                checked={checked}
                onChange={() => onChange(connector)}
                className={cn(
                  'size-4 shrink-0 appearance-none rounded-full border-2 bg-clip-content p-[2px] checked:bg-kurio-orange',
                  checked ? 'border-kurio-orange' : 'border-kurio-orange/70',
                  mobile && 'order-last mr-1',
                )}
              />
              {mobile && (
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2f1d15] text-sm font-bold text-kurio-orange-light">
                  {connector === 'coinbase' ? <WalletIcon size={16} /> : CONNECTOR_INITIAL[connector]}
                </span>
              )}
              {!mobile && connector === 'walletconnect' ? (
                <span className="inline-flex h-6 items-center rounded-[4px] border border-kurio-line bg-[#38220f] px-2 text-[9px] font-bold tracking-[0.04em] text-kurio-orange-light uppercase">
                  <span className="sr-only">WalletConnect: </span>MetaMask <span aria-hidden className="mx-2">•</span> WalletConnect{' '}
                  <span aria-hidden className="mx-2">•</span> Coinbase
                </span>
              ) : (
                <span className={cn('text-[15px]', mobile && 'flex-1 text-sm')}>{CONNECTOR_LABELS[connector]}</span>
              )}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-2 text-xs text-[#f4a28c]">
          {error}
        </p>
      )}
    </fieldset>
  )
}

// ─── Carteiras cadastradas (mobile) ────────────────────────────────────────

export function RegisteredWallets({
  wallets,
  value,
  onChange,
  onUseOther,
  error,
}: {
  wallets: Wallet[]
  value: string
  onChange: (wallet: Wallet) => void
  onUseOther: () => void
  error?: string
}) {
  const name = React.useId()
  return (
    <fieldset className="font-mono" aria-describedby={error ? `${name}-error` : undefined}>
      <div className="mb-3 flex items-center justify-between">
        <legend className="text-base font-bold">Carteira conectada</legend>
        <button type="button" onClick={onUseOther} className="text-sm font-semibold text-kurio-orange-light hover:text-kurio-cream">
          Trocar carteira
        </button>
      </div>
      <div className="space-y-3">
        {wallets.map((wallet) => {
          const checked = value === wallet.id
          return (
            <div key={wallet.id} className={cn('relative flex items-center rounded-[14px] bg-kurio-surface', checked && 'ring-1 ring-kurio-orange/50')}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 py-3.5 pl-4">
                <input
                  type="radio"
                  name={name}
                  checked={checked}
                  onChange={() => onChange(wallet)}
                  className="size-4 shrink-0 appearance-none rounded-full border-2 border-kurio-orange/70 bg-clip-content p-[2px] checked:border-kurio-orange checked:bg-kurio-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kurio-orange"
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">{wallet.label}</span>
                  <span className="block truncate text-[13px] text-kurio-sand">{wallet.ens ?? shortAddress(wallet.address)}</span>
                  <span className="block text-[13px] text-kurio-sand">
                    {wallet.network === 'ethereum' ? 'Rede principal Ethereum' : `Rede ${NETWORK_LABELS[wallet.network]}`}
                  </span>
                </span>
              </label>
              <Link
                to="/carteiras"
                aria-label={`Gerenciar carteira ${wallet.label}`}
                className="mr-2 grid size-9 place-items-center rounded-md text-kurio-sand hover:text-kurio-orange-light"
              >
                <MoreVertical size={18} aria-hidden />
              </Link>
            </div>
          )
        })}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-2 text-xs text-[#f4a28c]">
          {error}
        </p>
      )}
    </fieldset>
  )
}
