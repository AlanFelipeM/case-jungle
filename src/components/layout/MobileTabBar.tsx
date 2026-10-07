import React from 'react'
import { Link } from '@tanstack/react-router'
import { ScanLine } from 'lucide-react'
import { FavoriteIcon, HomeIcon, ShopIcon, UserIcon } from '@/components/icons'
import { useCartCount } from '@/hooks/useCart'
import { QrScannerDialog } from './QrScannerDialog'

const ITEM =
  'relative grid h-12 place-items-center rounded-xl transition-colors hover:text-kurio-orange-light aria-[current=page]:text-kurio-orange-light'

// O Link marca aria-current="page" na rota ativa; "exact" evita que "/" fique sempre ativo
const EXACT = { exact: true }

/** Barra de navegação inferior do mobile (substitui a navbar abaixo de md) */
export function MobileTabBar() {
  const cartCount = useCartCount()
  const [scannerOpen, setScannerOpen] = React.useState(false)

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 font-mono text-kurio-sand md:hidden"
    >
      {/* Fundo com recorte curvo para o botão central (folga de 8,5px em volta dele) */}
      <div
        aria-hidden
        className="absolute inset-0 flex text-kurio-surface drop-shadow-[0_-8px_20px_rgba(0,0,0,0.35)]"
      >
        <div className="flex-1 rounded-tl-[28px] bg-current" />
        <div className="-mx-px flex w-[110px] shrink-0 flex-col">
          <svg width="110" height="72" viewBox="0 0 110 72" className="block shrink-0">
            <path d="M0 0H6.66A8 8 0 0 1 14.55 6.69A41 41 0 0 0 95.45 6.69A8 8 0 0 1 103.34 0H110V72H0Z" fill="currentColor" />
          </svg>
          <div className="-mt-px flex-1 bg-current" />
        </div>
        <div className="flex-1 rounded-tr-[28px] bg-current" />
      </div>

      <ul className="relative grid h-[72px] grid-cols-5 items-center px-3 pb-[env(safe-area-inset-bottom)]">
        <li>
          <Link to="/" aria-label="Início" activeOptions={EXACT} className={ITEM}>
            <HomeIcon size={22} />
          </Link>
        </li>
        <li>
          <Link to="/favoritos" aria-label="Favoritos" activeOptions={EXACT} className={ITEM}>
            <FavoriteIcon size={22} />
          </Link>
        </li>
        <li className="relative h-full">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="Ler QR code de um NFT"
            aria-haspopup="dialog"
            className="absolute -top-[32.5px] left-1/2 grid size-[65px] -translate-x-1/2 place-items-center rounded-full bg-[linear-gradient(180deg,rgba(210,138,76,0.4)_0%,#d28a4c_100%)] text-kurio-bg backdrop-blur-[2px] transition-transform active:scale-95"
          >
            <ScanLine size={26} strokeWidth={2} aria-hidden />
          </button>
        </li>
        <li>
          <Link
            to="/carrinho"
            activeOptions={EXACT}
            aria-label={
              cartCount > 0
                ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`
                : 'Carrinho, vazio'
            }
            className={ITEM}
          >
            <ShopIcon size={22} />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute top-1.5 left-1/2 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-kurio-orange px-1 text-[10px] leading-none font-semibold text-kurio-bg"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link to="/perfil" aria-label="Perfil" activeOptions={EXACT} className={ITEM}>
            <UserIcon size={22} />
          </Link>
        </li>
      </ul>

      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </nav>
  )
}
