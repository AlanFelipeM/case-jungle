import React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useSession } from '@/hooks/useAuth'
import { AuthPanel, type AuthMode } from '@/components/auth/AuthPanel'

/**
 * Login e cadastro por URL (/login, /cadastro): tela própria no mobile e
 * cartão centralizado no desktop. Após entrar, volta para o fluxo anterior.
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { redirect?: string; reason?: 'expired' }
  const { isAuthenticated } = useSession()
  const redirect = search.redirect ?? '/'

  React.useEffect(() => {
    document.title = `${mode === 'login' ? 'Entrar' : 'Criar conta'} — Kurio`
    return () => {
      document.title = 'Kurio — Marketplace de NFTs'
    }
  }, [mode])

  // Já autenticado (ex.: voltou para /login pelo histórico)
  React.useEffect(() => {
    if (isAuthenticated) navigate({ href: redirect, replace: true })
  }, [isAuthenticated, navigate, redirect])

  return (
    <div className="mx-auto max-w-[1440px] md:px-6 md:py-16">
      <div className="mx-auto md:max-w-[500px] md:bg-kurio-surface">
        <AuthPanel
          variant="page"
          mode={mode}
          notice={search.reason === 'expired' ? 'Sua sessão expirou. Entre novamente para continuar de onde parou.' : undefined}
          onModeChange={(next) =>
            navigate({ to: next === 'login' ? '/login' : '/cadastro', search: { redirect: search.redirect }, replace: true })
          }
          onSuccess={() => navigate({ href: redirect, replace: true })}
        />
        <div aria-hidden className="hidden h-2.5 bg-kurio-orange md:block" />
      </div>
    </div>
  )
}
