import React from 'react'
import { Link, Outlet, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, MapPin } from 'lucide-react'
import {
  ActivityIcon,
  CartIcon,
  DangerTriangleIcon,
  DownloadIcon,
  HeartOutlineIcon,
  LogoutIcon,
  UserOutlineIcon,
} from '@/components/icons'
import { useLogout } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/perfil', label: 'Dados do perfil', icon: <UserOutlineIcon size={18} /> },
  { to: '/perfil/carteiras', label: 'Carteiras', icon: <MapPin size={18} strokeWidth={1.5} aria-hidden /> },
  { to: '/perfil/atividade', label: 'Atividade', icon: <CartIcon size={17} /> },
  { to: '/perfil/lista-de-interesse', label: 'Lista de interesse', icon: <HeartOutlineIcon size={16} /> },
  { to: '/perfil/ofertas', label: 'Ofertas', icon: <ActivityIcon size={18} /> },
  { to: '/perfil/arquivos-baixados', label: 'Arquivos baixados', icon: <DownloadIcon size={18} /> },
  { to: '/perfil/suporte', label: 'Suporte', icon: <DangerTriangleIcon size={18} /> },
] as const

/** Área "Meu perfil": navegação lateral (desktop) ou faixa rolável (mobile) */
export function ProfileLayout() {
  const navigate = useNavigate()
  const logout = useLogout()

  React.useEffect(() => {
    document.title = 'Meu perfil — Kurio'
    return () => {
      document.title = 'Kurio — Marketplace de NFTs'
    }
  }, [])

  function signOut() {
    logout.mutate(undefined, {
      onSettled: () => {
        toast('Você saiu da sua conta.')
        navigate({ to: '/', replace: true })
      },
    })
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-5 pb-16 font-mono text-kurio-cream md:px-6 md:pt-8">
      <div className="mx-auto grid max-w-[1200px] gap-6 md:grid-cols-[240px_1fr] md:gap-7 lg:grid-cols-[310px_1fr]">
        <MobileHeader />

        {/* Desktop/tablet: navegação lateral */}
        <aside aria-labelledby="profile-nav-title" className="hidden self-start bg-kurio-surface md:block">
          <h1 id="profile-nav-title" className="px-2.5 pt-5 pb-2 text-[17px] leading-6 font-bold">
            Meu perfil
          </h1>
          <nav aria-label="Seções do perfil">
            <ul>
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true }}
                    className="flex h-[45px] items-center gap-3 border-l-4 border-transparent pl-2.5 text-[15px] text-kurio-orange-light transition-colors hover:text-kurio-cream aria-[current=page]:border-kurio-orange"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            className="flex h-12 w-full items-center gap-3 border-t border-kurio-line px-3.5 text-[15px] font-bold text-kurio-orange-light transition-colors hover:text-kurio-cream"
          >
            <LogoutIcon size={20} />
            Sair
          </button>
        </aside>

        {/* Mobile: seções em faixa rolável */}
        <nav aria-label="Seções do perfil" className="-mx-5 overflow-x-auto px-5 md:hidden">
          <ul className="flex gap-2 pb-1">
            {NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <Link
                  to={item.to}
                  activeOptions={{ exact: true }}
                  className="flex h-10 items-center gap-2 rounded-full border border-kurio-line bg-kurio-surface px-3.5 text-sm whitespace-nowrap text-kurio-sand transition-colors aria-[current=page]:border-kurio-orange aria-[current=page]:text-kurio-orange-light"
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <button
                type="button"
                onClick={signOut}
                className="flex h-10 items-center gap-2 rounded-full border border-kurio-line bg-kurio-surface px-3.5 text-sm font-bold text-kurio-orange-light"
              >
                <LogoutIcon size={18} />
                Sair
              </button>
            </li>
          </ul>
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function MobileHeader() {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  return (
    <div className="relative flex h-9 items-center justify-center md:hidden">
      <button
        type="button"
        onClick={() => (canGoBack ? router.history.back() : navigate({ to: '/' }))}
        aria-label="Voltar"
        className="absolute left-0 grid size-[30px] place-items-center rounded-full bg-[#2f1d15] transition-colors hover:text-kurio-orange-light"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <p aria-hidden className="text-[17px] font-bold">
        Meu perfil
      </p>
    </div>
  )
}

/** Título de seção no padrão do layout */
export function SectionTitle({ id, children, action }: { id: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <h2 id={id} className="text-[15px] leading-6 font-bold md:text-base">
        {children}
      </h2>
      {action}
    </div>
  )
}

/** Seções fora do escopo da demonstração (README §3) */
export function ProfileUnavailable({ title }: { title: string }) {
  return (
    <section aria-labelledby="unavailable-title" className="flex flex-col items-start pt-2">
      <SectionTitle id="unavailable-title">{title}</SectionTitle>
      <div className={cn('mt-6 flex w-full items-start gap-3 bg-kurio-surface p-5 text-sm leading-6')}>
        <DangerTriangleIcon size={20} className="mt-0.5 shrink-0 text-kurio-orange-light" />
        <div>
          <p>Esta seção não faz parte desta demonstração do marketplace.</p>
          <Link to="/" hash="catalogo" className="mt-2 inline-block font-semibold text-kurio-orange-light underline-offset-2 hover:underline">
            Explorar o catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}
