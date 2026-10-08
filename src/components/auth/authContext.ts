import React from 'react'
import type { AuthMode } from './AuthPanel'

/** Telas que exigem login (também protegidas no roteador) */
export const PROTECTED_PATHS = ['/pagamento', '/perfil', '/carteiras', '/favoritos', '/pedido/']
export const isProtectedPath = (pathname: string) => PROTECTED_PATHS.some((p) => pathname.startsWith(p))

export interface OpenAuthOptions {
  mode?: AuthMode
  /** Para onde voltar depois de entrar (padrão: página atual) */
  redirect?: string
  notice?: string
}

export const AuthContext = React.createContext<{ openAuth: (options?: OpenAuthOptions) => void } | null>(null)

export function useAuthPrompt() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error('useAuthPrompt deve ser usado dentro de AuthProvider')
  return context
}
