import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api } from '@/lib/api'
import { getErrorStatus } from '@/lib/apiError'
import type { CollectorProfile, CreateOrderPayload, Network, Order, Wallet, WalletConnector, WalletSession } from '@/types'

export const checkoutKeys = {
  profile: ['profile'] as const,
  wallets: ['wallets'] as const,
  order: (id: string) => ['orders', id] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: checkoutKeys.profile,
    queryFn: async ({ signal }) => (await api.get<CollectorProfile>('/profile', { signal })).data,
    staleTime: 5 * 60_000,
  })
}

export function useWallets() {
  return useQuery({
    queryKey: checkoutKeys.wallets,
    queryFn: async ({ signal }) => (await api.get<Wallet[]>('/wallets', { signal })).data,
    staleTime: 5 * 60_000,
  })
}

export function useConnectWallet() {
  return useMutation({
    mutationFn: async (input: { connector: WalletConnector; address: string; network: Network }) =>
      (await api.post<WalletSession>('/wallet/connect', input)).data,
  })
}

export function useDisconnectWallet() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api.post('/wallet/disconnect', { sessionId })
    },
  })
}

/** Timeout, falha de rede ou 5xx: o mesmo pedido pode ser reenviado com a mesma chave */
export function isTransientError(error: unknown) {
  if (!isAxiosError(error)) return false
  const status = error.response?.status
  return !error.response || error.code === 'ECONNABORTED' || (status !== undefined && status >= 500)
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ payload, idempotencyKey }: { payload: CreateOrderPayload; idempotencyKey: string }) =>
      (await api.post<Order>('/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    // Reenvio seguro: a chave de idempotência garante que não haverá pedido duplicado
    retry: (failureCount, error) => failureCount < 2 && isTransientError(error),
    retryDelay: 800,
    onSuccess: (order) => queryClient.setQueryData(checkoutKeys.order(order.id), order),
  })
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: checkoutKeys.order(orderId ?? ''),
    queryFn: async ({ signal }) => (await api.get<Order>(`/orders/${orderId}`, { signal })).data,
    enabled: !!orderId,
    retry: (failureCount, error) => getErrorStatus(error) !== 404 && failureCount < 2,
    // O evento order.updated é a via principal; a consulta periódica cobre eventos perdidos
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 5_000 : false),
  })
}
