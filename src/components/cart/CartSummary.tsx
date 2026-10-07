import React from 'react'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import type { Quote } from '@/types'
import { useApplyCoupon, useRemoveCoupon } from '@/hooks/useCart'
import { getErrorMessage } from '@/lib/apiError'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

interface CartSummaryProps {
  quote: Quote | undefined
  /** Cotação sendo recalculada (valores podem estar desatualizados) */
  updating: boolean
  checkoutDisabled: boolean
  checkoutHint?: string
  onCheckout: () => void
  variant: 'panel' | 'sheet'
}

export function CartSummary({ quote, updating, checkoutDisabled, checkoutHint, onCheckout, variant }: CartSummaryProps) {
  const sheet = variant === 'sheet'
  const hintId = React.useId()

  return (
    <div className={cn('font-mono', sheet ? 'text-sm' : 'text-[15px]')}>
      <CouponForm quote={quote} sheet={sheet} />

      <dl
        aria-busy={updating}
        className={cn('space-y-2.5 transition-opacity', sheet ? 'mt-4' : 'mt-6 space-y-3', updating && 'opacity-60')}
      >
        <Row label="Subtotal" value={quote ? formatEth(quote.subtotal) : '—'} />
        <Row
          label={quote?.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'}
          value={quote ? `(-) ${formatEth(quote.discount)}` : '—'}
        />
        <div>
          <Row label="Taxa de rede" value={quote ? formatEth(quote.networkFee) : '—'} />
          <p className="mt-0.5 text-right text-[11px] text-kurio-orange-light">Taxa estimada</p>
        </div>
        <div className={cn('flex items-baseline justify-between gap-4 font-bold', sheet ? 'pt-1' : 'pt-4')}>
          <dt className="text-base">Total</dt>
          <dd className="text-lg text-kurio-orange-light">{quote ? formatEth(quote.total) : '—'}</dd>
        </div>
      </dl>
      <p className="sr-only" aria-live="polite">
        {quote && !updating ? `Total atualizado: ${formatEth(quote.total)}` : ''}
      </p>

      <button
        type="button"
        onClick={onCheckout}
        disabled={checkoutDisabled}
        aria-describedby={checkoutHint ? hintId : undefined}
        className={cn(
          'w-full font-semibold text-kurio-bg transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          sheet
            ? 'mt-5 h-[52px] rounded-full bg-[linear-gradient(90deg,#ce874a_0%,#b87843_100%)] text-base'
            : 'mt-8 h-10 rounded-[4px] bg-kurio-orange hover:bg-kurio-orange-hover',
        )}
      >
        Conectar e finalizar
      </button>
      {checkoutHint && (
        <p id={hintId} className="mt-2 text-center text-xs text-kurio-sand">
          {checkoutHint}
        </p>
      )}

      {!sheet && (
        <Link
          to="/"
          hash="catalogo"
          className="mt-4 block text-center text-kurio-orange-light transition-colors hover:text-kurio-cream"
        >
          Continuar explorando
        </Link>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

export function CouponForm({ quote, sheet }: { quote: Quote | undefined; sheet: boolean }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = React.useState('')
  const inputId = React.useId()
  const messageId = React.useId()

  if (quote?.coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-kurio-orange/60 bg-kurio-orange/10 px-3 py-2">
        <p className="text-sm">
          Código <strong className="text-kurio-orange-light">{quote.coupon.code}</strong> aplicado (−{quote.coupon.percent}%)
        </p>
        <button
          type="button"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          aria-label={`Remover código ${quote.coupon.code}`}
          className="grid size-7 shrink-0 place-items-center rounded transition-colors hover:text-kurio-orange-light disabled:opacity-50"
        >
          <X size={16} aria-hidden />
        </button>
        {remove.isError && (
          <p role="alert" className="sr-only">
            {getErrorMessage(remove.error, 'Não foi possível remover o código.')}
          </p>
        )}
      </div>
    )
  }

  function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    apply.mutate(code.trim(), { onSuccess: () => setCode('') })
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor={inputId} className={cn('text-[13px] font-semibold', sheet ? 'sr-only' : 'mb-2 block')}>
        Código promocional
      </label>
      <div className={cn('flex', sheet ? 'h-12 rounded-full border border-kurio-line' : 'h-10')}>
        <input
          id={inputId}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={apply.isError || undefined}
          aria-describedby={apply.isError ? messageId : undefined}
          className={cn(
            'min-w-0 flex-1 bg-kurio-bg text-[13px] text-kurio-cream placeholder:text-kurio-muted focus-visible:outline-offset-0',
            sheet ? 'rounded-l-full bg-transparent pl-4' : 'border border-kurio-orange px-3',
          )}
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={cn(
            'shrink-0 font-semibold transition-colors disabled:opacity-60',
            sheet
              ? 'rounded-full bg-[linear-gradient(90deg,#b87843_0%,#ce874a_100%)] px-6 text-kurio-cream'
              : 'w-[101px] bg-kurio-orange text-kurio-bg hover:bg-kurio-orange-hover',
          )}
        >
          {apply.isPending ? '…' : 'Aplicar'}
        </button>
      </div>
      {apply.isError && (
        <p id={messageId} role="alert" className="mt-2 text-xs text-[#f4a28c]">
          {getErrorMessage(apply.error, 'Não foi possível aplicar o código.')}
        </p>
      )}
    </form>
  )
}
