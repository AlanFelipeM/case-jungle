import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { MobileTabBar } from './MobileTabBar'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  // Eventos Socket.IO mantêm catálogo, detalhe e carrinho atualizados
  useRealtimeSync()
  // Mobile: no detalhe e no carrinho, as barras de compra/resumo substituem a navegação inferior
  const pathname = useLocation({ select: (l) => l.pathname })
  const isDetail = pathname.startsWith('/nft/')
  const showTabBar = !isDetail && pathname !== '/carrinho' && pathname !== '/pagamento'

  return (
    <div
      className={
        showTabBar
          ? 'flex min-h-screen flex-col bg-kurio-bg pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0'
          : isDetail
            ? // espaço para a barra de compra fixa do detalhe (mobile)
              'flex min-h-screen flex-col bg-kurio-bg pb-[calc(150px+env(safe-area-inset-bottom))] md:pb-0'
            : 'flex min-h-screen flex-col bg-kurio-bg'
      }
    >
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      {showTabBar && <MobileTabBar />}
    </div>
  )
}
