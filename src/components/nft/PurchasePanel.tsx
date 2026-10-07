import React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Heart, Minus, Plus } from 'lucide-react'
import { MAX_QUANTITY_PER_ORDER, type NFT, type NFTEdition } from '@/types'
import { ShopIcon } from '@/components/icons'
import { useAddToCart } from '@/hooks/useCart'
import { nftKeys } from '@/hooks/useNFTs'
import { getErrorMessage, getErrorStatus } from '@/lib/apiError'
import { cn } from '@/lib/utils'

/** Edição inicial: 1/50 quando disponível (como no layout), senão a primeira disponível */
function defaultEdition(editions: NFTEdition[]) {
  const available = editions.filter((e) => e.available !== 0)
  return available.find((e) => e.label === '1/50') ?? available[0] ?? editions[0]
}

const maxQuantity = (edition: NFTEdition) =>
  Math.min(edition.available ?? MAX_QUANTITY_PER_ORDER, MAX_QUANTITY_PER_ORDER)

function availabilityText(edition: NFTEdition) {
  if (edition.available === 0) return 'Edição esgotada.'
  if (edition.available === null) return `Edição aberta: até ${MAX_QUANTITY_PER_ORDER} unidades por pedido.`
  return `${edition.available} de ${edition.total} ${edition.available === 1 ? 'disponível' : 'disponíveis'}.`
}

export function PurchasePanel({ nft }: { nft: NFT }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const addToCart = useAddToCart()
  const [editionId, setEditionId] = React.useState(() => defaultEdition(nft.editions).id)
  const [quantity, setQuantity] = React.useState(1)
  // "Comprar" leva ao carrinho; o botão de carrinho (mobile) só adiciona
  const [lastAction, setLastAction] = React.useState<'buy' | 'add'>('buy')
  const groupId = React.useId()

  const edition = nft.editions.find((e) => e.id === editionId) ?? defaultEdition(nft.editions)
  const soldOut = edition.available === 0
  const max = maxQuantity(edition)

  // Se a disponibilidade mudar (ex.: atualização em tempo real), mantém a quantidade válida
  React.useEffect(() => {
    setQuantity((q) => Math.min(Math.max(q, 1), Math.max(max, 1)))
  }, [max])

  function selectEdition(id: string) {
    setEditionId(id)
    setQuantity(1)
    addToCart.reset()
  }

  function changeQuantity(next: number) {
    setQuantity(Math.min(Math.max(next, 1), Math.max(max, 1)))
    addToCart.reset()
  }

  function submit(action: 'buy' | 'add') {
    setLastAction(action)
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          if (action === 'buy') navigate({ to: '/carrinho' })
        },
        // Disponibilidade mudou no servidor: recarrega o NFT
        onError: (error) => {
          if (getErrorStatus(error) === 409) queryClient.invalidateQueries({ queryKey: nftKeys.detail(nft.id) })
        },
      },
    )
  }

  const favorite = () => navigate({ to: '/login', search: { redirect: location.href } })

  const feedback = addToCart.isError ? (
    <p role="alert" className="text-sm text-[#f4a28c]">
      {getErrorMessage(addToCart.error, 'Não foi possível adicionar ao carrinho.')}
    </p>
  ) : addToCart.isSuccess && lastAction === 'add' ? (
    <p role="status" className="text-sm text-kurio-orange-light">
      Adicionado ao carrinho.
    </p>
  ) : null

  return (
    <div>
      <fieldset aria-describedby={`${groupId}-availability`}>
        <legend className="text-sm leading-5 font-semibold md:text-[15px]">Edição:</legend>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {nft.editions.map((e) => {
            const disabled = e.available === 0
            const checked = e.id === edition.id
            return (
              <label
                key={e.id}
                className={cn(
                  'inline-flex h-6 cursor-pointer items-center rounded-full border px-2 text-[13px] uppercase transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-kurio-orange',
                  checked
                    ? 'border-kurio-orange bg-kurio-orange/10 font-semibold text-kurio-orange-light'
                    : 'border-kurio-outline text-kurio-sand hover:border-kurio-sand',
                  disabled && 'cursor-not-allowed line-through opacity-50 hover:border-kurio-outline',
                )}
              >
                <input
                  type="radio"
                  name={`${groupId}-edition`}
                  value={e.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => selectEdition(e.id)}
                  className="sr-only"
                />
                {e.label}
                {disabled && <span className="sr-only"> (esgotada)</span>}
              </label>
            )
          })}
        </div>
        <p id={`${groupId}-availability`} className="mt-1.5 text-xs text-kurio-sand">
          {availabilityText(edition)}
        </p>
      </fieldset>

      {/* Desktop/tablet: ações no fluxo da página */}
      <div className="hidden md:block">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <QuantityStepper
            quantity={quantity}
            max={max}
            soldOut={soldOut}
            onChange={changeQuantity}
            className="gap-5"
            buttonClassName="h-12 w-[31px] rounded-full"
            iconSize={20}
            valueClassName="text-lg"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit('buy')}
              disabled={soldOut || addToCart.isPending}
              className="h-10 w-[130px] rounded-[4px] bg-kurio-orange px-4 text-sm font-semibold text-kurio-bg uppercase transition-colors hover:bg-kurio-orange-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addToCart.isPending ? 'Adicionando…' : soldOut ? 'Esgotado' : 'Comprar'}
            </button>
            <button
              type="button"
              onClick={favorite}
              aria-label={`Favoritar ${nft.name} (requer login)`}
              className="inline-flex h-10 w-[130px] items-center justify-center gap-2 rounded-[4px] border border-kurio-orange px-3 text-sm text-kurio-orange-light transition-colors hover:bg-kurio-orange hover:text-kurio-bg"
            >
              <Heart size={18} aria-hidden />
              Favoritar
            </button>
          </div>
        </div>

        {quantity >= max && !soldOut && max > 1 && (
          <p className="mt-2 text-xs text-kurio-sand">Quantidade máxima para esta edição: {max}.</p>
        )}
        {feedback && <div className="mt-3">{feedback}</div>}
      </div>

      {/* Mobile: barra de compra fixa */}
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] bg-kurio-surface px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] md:hidden">
        {feedback && <div className="mb-3">{feedback}</div>}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span id={`${groupId}-qty`} className="text-sm text-kurio-cream/80">
              Qtd.
            </span>
            <QuantityStepper
              quantity={quantity}
              max={max}
              soldOut={soldOut}
              onChange={changeQuantity}
              className="gap-3"
              buttonClassName="h-7 w-6 rounded-md"
              iconSize={14}
              valueClassName="text-base"
            />
          </div>
          <p className="text-lg leading-6 font-bold text-kurio-orange-light">
            <span className="sr-only">Preço: </span>
            {nft.price} ETH
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => submit('buy')}
            disabled={soldOut || addToCart.isPending}
            className="h-[52px] w-[172px] rounded-full bg-[linear-gradient(90deg,#ce874a_0%,#b87843_100%)] text-base font-semibold text-kurio-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addToCart.isPending && lastAction === 'buy' ? 'Adicionando…' : soldOut ? 'Esgotado' : 'Comprar NFT'}
          </button>
          <button
            type="button"
            onClick={() => submit('add')}
            disabled={soldOut || addToCart.isPending}
            aria-label="Adicionar ao carrinho"
            className="grid size-[52px] place-items-center rounded-full bg-[#2f1d15] text-kurio-muted transition-colors hover:text-kurio-orange-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShopIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

function QuantityStepper({
  quantity,
  max,
  soldOut,
  onChange,
  className,
  buttonClassName,
  iconSize,
  valueClassName,
}: {
  quantity: number
  max: number
  soldOut: boolean
  onChange: (next: number) => void
  className?: string
  buttonClassName?: string
  iconSize: number
  valueClassName?: string
}) {
  const button =
    'grid place-items-center bg-kurio-orange text-kurio-bg transition-colors hover:bg-kurio-orange-hover disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div role="group" aria-label="Quantidade" className={cn('flex items-center', className)}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1 || soldOut}
        aria-label="Diminuir quantidade"
        className={cn(button, buttonClassName)}
      >
        <Minus size={iconSize} strokeWidth={2.5} aria-hidden />
      </button>
      <output aria-live="polite" className={cn('min-w-4 text-center', valueClassName)}>
        {soldOut ? 0 : quantity}
      </output>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max || soldOut}
        aria-label="Aumentar quantidade"
        className={cn(button, buttonClassName)}
      >
        <Plus size={iconSize} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}
