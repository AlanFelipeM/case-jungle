import React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { clearPrivateData } from '@/hooks/useAuth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SESSION_EXPIRED_EVENT } from '@/lib/session'
import { toast } from '@/lib/toast'
import { AuthPanel, type AuthMode } from './AuthPanel'

/** Telas que exigem login (também protegidas no roteador) */
export const PROTECTED_PATHS = ['/pagamento', '/perfil', '/carteiras', '/favoritos', '/pedido/']
export const isProtectedPath = (pathname: string) => PROTECTED_PATHS.some((p) => pathname.startsWith(p))

const EXPIRED_NOTICE = 'Sua sessão expirou. Entre novamente para continuar de onde parou.'

interface OpenAuthOptions {
  mode?: AuthMode
  /** Para onde voltar depois de entrar (padrão: página atual) */
  redirect?: string
  notice?: string
}

const AuthContext = React.createContext<{ openAuth: (options?: OpenAuthOptions) => void } | null>(null)

export function useAuthPrompt() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error('useAuthPrompt deve ser usado dentro de AuthProvider')
  return context
}

/**
 * Login/cadastro acessível de qualquer tela:
 * no desktop abre o modal sobre a página atual; no mobile leva à tela /login ou /cadastro.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = React.useState<{ open: boolean; mode: AuthMode; redirect?: string; notice?: string }>({
    open: false,
    mode: 'login',
  })

  const openAuth = React.useCallback(
    ({ mode = 'login', redirect, notice }: OpenAuthOptions = {}) => {
      if (isDesktop) {
        setDialog({ open: true, mode, redirect, notice })
      } else {
        navigate({
          to: mode === 'login' ? '/login' : '/cadastro',
          search: { redirect: redirect ?? location.href, reason: notice === EXPIRED_NOTICE ? 'expired' : undefined },
        })
      }
    },
    [isDesktop, navigate, location.href],
  )

  // Sessão expirada durante a navegação: limpa dados privados e preserva o contexto
  React.useEffect(() => {
    const onExpired = () => {
      clearPrivateData(queryClient, { keepCheckoutDraft: true })
      if (isProtectedPath(location.pathname)) {
        navigate({ to: '/login', search: { redirect: location.href, reason: 'expired' }, replace: true })
      } else {
        toast(EXPIRED_NOTICE)
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [queryClient, navigate, location.pathname, location.href])

  const close = () => setDialog((d) => ({ ...d, open: false }))

  return (
    <AuthContext.Provider value={{ openAuth }}>
      {children}
      <DialogPrimitive.Root open={dialog.open} onOpenChange={(open) => !open && close()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-hero-fade" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-kurio-surface shadow-2xl motion-safe:animate-hero-fade"
          >
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-md text-kurio-orange-light transition-colors hover:text-kurio-cream"
            >
              <X size={20} aria-hidden />
            </DialogPrimitive.Close>
            <AuthPanel
              variant="dialog"
              mode={dialog.mode}
              onModeChange={(mode) => setDialog((d) => ({ ...d, mode }))}
              notice={dialog.notice}
              TitleComponent={DialogPrimitive.Title}
              onSuccess={() => {
                close()
                if (dialog.redirect && dialog.redirect !== location.href) navigate({ href: dialog.redirect })
              }}
            />
            <div aria-hidden className="mt-12 h-2.5 bg-kurio-orange" />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </AuthContext.Provider>
  )
}
