import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { MAX_QUANTITY_PER_ORDER, type CartItem, type QuoteLine } from '@/types'
import { compareEth, formatEth, mulEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

export interface CartItemActions {
  onQuantityChange: (item: CartItem, quantity: number) => void
  onRemove: (item: CartItem) => void
}

interface ItemProps extends CartItemActions {
  item: CartItem
  line?: QuoteLine
}

const limitFor = (item: CartItem) => Math.min(item.edition.available ?? MAX_QUANTITY_PER_ORDER, MAX_QUANTITY_PER_ORDER)

/** Aviso de disponibilidade da linha (estoque menor que a quantidade no carrinho) */
function AvailabilityWarning({ item, onQuantityChange, className }: Pick<ItemProps, 'item' | 'onQuantityChange'> & { className?: string }) {
  const available = item.edition.available
  if (available === null || item.quantity <= available) return null
  return (
    <p className={cn('text-xs leading-5 text-[#f4a28c]', className)}>
      {available === 0 ? (
        'Edição esgotada. Remova o item.'
      ) : (
        <>
          Só restam {available}.{' '}
          <button
            type="button"
            onClick={() => onQuantityChange(item, available)}
            className="font-semibold underline underline-offset-2 hover:text-kurio-cream"
          >
            Ajustar para {available}
          </button>
        </>
      )}
    </p>
  )
}

function PriceCell({ item }: { item: CartItem }) {
  const changed = compareEth(item.nft.price, item.priceSnapshot) !== 0
  return (
    <>
      {formatEth(item.nft.price)}
      {changed && (
        <span className="block text-xs font-normal text-kurio-muted line-through">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(item.priceSnapshot)}
        </span>
      )}
    </>
  )
}

function Stepper({
  item,
  onQuantityChange,
  variant,
}: Pick<ItemProps, 'item' | 'onQuantityChange'> & { variant: 'table' | 'card' }) {
  const max = limitFor(item)
  const button =
    variant === 'table'
      ? 'grid h-[26px] w-[22px] place-items-center rounded-full bg-kurio-orange text-kurio-bg hover:bg-kurio-orange-hover'
      : 'grid size-[22px] place-items-center rounded-full bg-[#2f1d15] text-kurio-cream hover:text-kurio-orange-light'
  return (
    <div
      role="group"
      aria-label={`Quantidade de ${item.nft.name}`}
      className={cn('flex items-center', variant === 'table' ? 'gap-3' : 'gap-2')}
    >
      <button
        type="button"
        onClick={() => onQuantityChange(item, item.quantity - 1)}
        disabled={item.quantity <= 1}
        aria-label="Diminuir quantidade"
        className={cn(button, 'transition-colors disabled:cursor-not-allowed disabled:opacity-35')}
      >
        <Minus size={14} strokeWidth={2.5} aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-3 text-center text-[15px]">
        {item.quantity}
      </output>
      <button
        type="button"
        onClick={() => onQuantityChange(item, item.quantity + 1)}
        disabled={item.quantity >= max}
        aria-label="Aumentar quantidade"
        className={cn(button, 'transition-colors disabled:cursor-not-allowed disabled:opacity-35')}
      >
        <Plus size={14} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}

function RemoveButton({ item, onRemove, className }: Pick<ItemProps, 'item' | 'onRemove'> & { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onRemove(item)}
      aria-label={`Remover ${item.nft.name} (edição ${item.edition.label}) do carrinho`}
      className={cn(
        'grid size-8 place-items-center rounded-md text-kurio-muted transition-colors hover:text-kurio-orange-light',
        className,
      )}
    >
      <Trash2 size={18} aria-hidden />
    </button>
  )
}

/** Desktop/tablet: tabela */
export function CartTable({ items, lines, ...actions }: { items: CartItem[]; lines: Map<string, QuoteLine> } & CartItemActions) {
  return (
    <table className="hidden w-full border-separate border-spacing-y-3 text-left md:table">
      <caption className="sr-only">Itens no carrinho</caption>
      <thead>
        <tr className="text-[15px] leading-5">
          <th scope="col" className="border-b border-kurio-line pb-2.5 font-semibold">NFTs</th>
          <th scope="col" className="border-b border-kurio-line pb-2.5 font-semibold">Preço</th>
          <th scope="col" className="border-b border-kurio-line pb-2.5 font-semibold">Edições</th>
          <th scope="col" className="border-b border-kurio-line pb-2.5 font-semibold">Total</th>
          <th scope="col" className="border-b border-kurio-line pb-2.5">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          return (
            <tr key={item.id} className="bg-kurio-surface align-middle">
              <td className="w-[311px] p-0">
                <div className="flex items-center gap-4">
                  <img
                    src={item.nft.image}
                    alt=""
                    width={70}
                    height={70}
                    loading="lazy"
                    className="size-[70px] shrink-0 object-cover"
                  />
                  <div className="min-w-0 py-2 pr-2">
                    <Link
                      to="/nft/$nftId"
                      params={{ nftId: item.nftId }}
                      className="block truncate text-[15px] leading-6 font-bold hover:text-kurio-orange-light"
                    >
                      {item.nft.name}
                    </Link>
                    <p className="text-[13px] leading-5 whitespace-nowrap text-kurio-muted">
                      ID do token: {item.nft.tokenId} · <span className="sr-only">edição </span>
                      {item.edition.label}
                    </p>
                    <AvailabilityWarning item={item} onQuantityChange={actions.onQuantityChange} />
                  </div>
                </div>
              </td>
              <td className="w-[138px] text-[15px] font-bold text-kurio-sand">
                <PriceCell item={item} />
              </td>
              <td className="w-[137px]">
                <Stepper item={item} onQuantityChange={actions.onQuantityChange} variant="table" />
              </td>
              <td className="text-[15px] font-bold text-kurio-orange-light">
                {formatEth(lines.get(item.id)?.total ?? mulEth(item.nft.price, item.quantity))}
              </td>
              <td className="w-[60px] pr-4 text-right">
                <RemoveButton item={item} onRemove={actions.onRemove} className="ml-auto" />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Mobile: cards */
export function CartCards({ items, ...actions }: { items: CartItem[] } & CartItemActions) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="Itens no carrinho">
      {items.map((item) => {
        return (
          <li key={item.id} className="relative flex rounded-[14px] bg-kurio-surface">
            <img
              src={item.nft.image}
              alt=""
              width={86}
              height={86}
              loading="lazy"
              className="size-[86px] shrink-0 rounded-[14px] object-cover"
            />
            <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3 pl-2.5">
              <div className="min-w-0 flex-1">
                <Link
                  to="/nft/$nftId"
                  params={{ nftId: item.nftId }}
                  className="block truncate text-[13px] leading-5 font-bold"
                >
                  {item.nft.name}
                </Link>
                <p className="text-xs leading-5 text-kurio-muted">Edição: {item.edition.label}</p>
                <p className="mt-1.5 text-base leading-5 font-bold text-kurio-orange-light">
                  <span className="sr-only">Total: </span>
                  {formatEth(mulEth(item.nft.price, item.quantity))}
                </p>
                <AvailabilityWarning item={item} onQuantityChange={actions.onQuantityChange} className="mt-1" />
              </div>
              <Stepper item={item} onQuantityChange={actions.onQuantityChange} variant="card" />
              <RemoveButton item={item} onRemove={actions.onRemove} className="absolute top-1 right-1 size-7" />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
