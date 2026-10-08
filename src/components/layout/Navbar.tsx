import React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { CartIcon, LogoutIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useCartCount } from '@/hooks/useCart'
import { SearchDialog } from './SearchDialog'
import { UserMenu } from './UserMenu'
import { useSession } from '@/hooks/useAuth'
import { useAuthPrompt } from '@/components/auth/authContext'

const NAV_LINKS = [
  { label: 'Início', href: '/' },
  { label: 'Mercado', href: '/mercado' },
  { label: 'Criadores', href: '/criadores' },
  { label: 'Aprenda', href: '/aprenda' },
]

export function Navbar() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const location = useLocation()
  const cartCount = useCartCount()
  const { user, isLoading: sessionLoading } = useSession()
  const { openAuth } = useAuthPrompt()

  // Fecha o menu mobile ao navegar ou ao pressionar Escape
  React.useEffect(() => setMenuOpen(false), [location.pathname])
  React.useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 hidden w-full bg-kurio-bg font-mono text-kurio-cream md:block">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <div className="relative mx-auto flex h-[68px] max-w-[1200px] items-center justify-between border-b border-kurio-line pt-3">
          {/* Logo */}
          <Link to="/" className="text-sm font-bold tracking-[0.1em]" aria-label="Kurio — página inicial">
            KURIO
          </Link>

          {/* Desktop nav */}
          <nav
            className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 lg:flex xl:left-[376px] xl:translate-x-0"
            aria-label="Navegação principal"
          >
            <ul className="flex gap-10">
              {NAV_LINKS.map((link) => {
                const isActive =
                  location.pathname === link.href ||
                  (link.href === '/mercado' && (location.pathname.startsWith('/nft/') || ['/carrinho', '/pagamento'].includes(location.pathname)))
                return (
                  <li key={link.href} className="flex">
                    <Link
                      to={link.href}
                      activeOptions={{ exact: true }}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'relative pt-[21px] text-base leading-6 transition-colors',
                        isActive
                          ? 'font-semibold text-kurio-orange-light'
                          : 'hover:text-kurio-orange-light',
                      )}
                    >
                      {link.label}
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute inset-x-0 -bottom-px h-[3px] bg-kurio-orange"
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Ações */}
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <SearchDialog />
              <Link
                to="/carrinho"
                aria-label={
                  cartCount > 0
                    ? `Carrinho de compras, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`
                    : 'Carrinho de compras, vazio'
                }
                className="relative grid size-10 place-items-center rounded-md transition-colors hover:text-kurio-orange-light"
              >
                <CartIcon size={24} />
                {cartCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-2 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-kurio-orange px-1 text-[10px] leading-none font-semibold text-kurio-bg"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Conta: nome e avatar quando há sessão; senão "Entrar" (abre o modal) */}
            {sessionLoading ? (
              <span aria-hidden className="skeleton ml-7 size-8 rounded-full" />
            ) : user ? (
              <UserMenu user={user} />
            ) : (
              <button
                type="button"
                onClick={() => openAuth()}
                aria-haspopup="dialog"
                className="ml-7 inline-flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-[4px] bg-kurio-orange text-base font-medium text-kurio-bg transition-colors hover:bg-kurio-orange-hover"
              >
                <LogoutIcon size={20} />
                Entrar
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="ml-2 grid size-10 place-items-center rounded-md transition-colors hover:text-kurio-orange-light lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Navegação principal"
          className="border-b border-kurio-line bg-kurio-bg px-4 pb-6 pt-2 md:px-6 lg:hidden"
        >
          <ul className="mx-auto flex max-w-[1200px] flex-col">
            {NAV_LINKS.map((link) => {
              const isActive =
                  location.pathname === link.href ||
                  (link.href === '/mercado' && (location.pathname.startsWith('/nft/') || ['/carrinho', '/pagamento'].includes(location.pathname)))
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    activeOptions={{ exact: true }}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'block border-l-[3px] py-3 pl-3 text-base transition-colors',
                      isActive
                        ? 'border-kurio-orange font-semibold text-kurio-orange-light'
                        : 'border-transparent hover:text-kurio-orange-light',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </header>
  )
}
