import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { MobileTabBar } from './MobileTabBar'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-kurio-bg pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  )
}
