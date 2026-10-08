import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { MobileTabBar } from './MobileTabBar'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from '@/components/ui/Toaster'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  // Eventos Socket.IO mantêm catálogo, detalhe e carrinho atualizados
  useRealtimeSync()
  const pathname = useLocation({ select: (l) => l.pathname })
  const isDetail = pathname.startsWith('/nft/')
  // A confirmação do pedido é exibida em tela cheia, sem navegação
  const isReceipt = pathname.startsWith('/pedido/')
  // Mobile: login/cadastro são telas cheias, como no layout
  const isAuth = pathname === '/login' || pathname === '/cadastro'
  // Mobile: no detalhe, carrinho e pagamento, as barras de compra/resumo substituem a navegação inferior
  const showTabBar = !isDetail && !isAuth && pathname !== '/carrinho' && pathname !== '/pagamento'

  return (
    <AuthProvider>
      {isReceipt ? (
        <main id="main-content" className="min-h-screen bg-kurio-bg">
          {children}
        </main>
      ) : (
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
          {/* Altura mínima: enquanto uma rota carrega sob demanda, o rodapé não sobe e depois desce (CLS) */}
          <main id="main-content" className="min-h-screen flex-1">
            {children}
          </main>
          <div className={isAuth ? 'hidden md:block' : undefined}>
            <Footer />
          </div>
          {showTabBar && <MobileTabBar />}
        </div>
      )}
      <Toaster />
    </AuthProvider>
  )
}
