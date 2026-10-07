import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorStatus } from '@/lib/apiError'
import { clearAttempt } from '@/lib/checkout'
import { setToken, useToken } from '@/lib/session'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types'

export const authKeys = {
  session: (token: string | null) => ['auth', 'session', token] as const,
}

/** Dados que pertencem ao usuário: saem do cache no logout e na troca de conta */
const PRIVATE_KEYS = [['cart'], ['profile'], ['wallets'], ['orders'], ['favorites'], ['auth']]

export const CHECKOUT_DRAFT_KEY = 'kurio:checkout:draft'
const LAST_USER_KEY = 'kurio:last-user'

/**
 * Remove do cache os dados do usuário.
 * keepCheckoutDraft: sessão expirada — rascunho e pedido em andamento ficam para a retomada.
 */
export function clearPrivateData(queryClient: QueryClient, { keepCheckoutDraft = false } = {}) {
  PRIVATE_KEYS.forEach((queryKey) => queryClient.removeQueries({ queryKey }))
  if (keepCheckoutDraft) return
  clearAttempt()
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY)
    localStorage.removeItem(LAST_USER_KEY)
  } catch {
    // ignorado
  }
}

export function useSession() {
  const token = useToken()
  const query = useQuery({
    queryKey: authKeys.session(token),
    queryFn: async ({ signal }) => (await api.get<{ user: User }>('/auth/session', { signal })).data.user,
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => getErrorStatus(error) !== 401 && failureCount < 2,
  })
  return {
    user: token ? query.data : undefined,
    token,
    /** Recuperando a sessão salva (refresh) */
    isLoading: !!token && query.isLoading,
    isAuthenticated: !!token && !!query.data,
  }
}

function onAuthenticated(queryClient: QueryClient, data: AuthResponse) {
  let lastUser: string | null = null
  try {
    lastUser = localStorage.getItem(LAST_USER_KEY)
    localStorage.setItem(LAST_USER_KEY, data.user.id)
  } catch {
    // ignorado
  }
  // Outra conta: nada da sessão anterior permanece; mesma conta (sessão expirada): retoma o checkout
  clearPrivateData(queryClient, { keepCheckoutDraft: lastUser === data.user.id })
  setToken(data.token)
  queryClient.setQueryData(authKeys.session(data.token), data.user)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LoginPayload) => (await api.post<AuthResponse>('/auth/login', payload)).data,
    onSuccess: (data) => onAuthenticated(queryClient, data),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => (await api.post<AuthResponse>('/auth/register', payload)).data,
    onSuccess: (data) => onAuthenticated(queryClient, data),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Encerra no servidor; mesmo se falhar, a sessão local é limpa
      await api.post('/auth/logout').catch(() => undefined)
    },
    onSettled: () => {
      setToken(null)
      clearPrivateData(queryClient)
    },
  })
}
