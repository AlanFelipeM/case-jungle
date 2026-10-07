import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Cart, Quote } from '@/types'

export const cartKeys = {
  all: ['cart'] as const,
  quote: ['cart', 'quote'] as const,
  mutations: {
    item: ['cart', 'item'] as const,
  },
}

export function useCart() {
  return useQuery({
    queryKey: cartKeys.all,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Cart>('/cart', { signal })
      return data
    },
    staleTime: 30_000,
  })
}

/** Cotação calculada pela API (preços atuais, cupom, taxa e total) */
export function useCartQuote(enabled = true) {
  return useQuery({
    queryKey: cartKeys.quote,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Quote>('/cart/quote', { signal })
      return data
    },
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** Total de unidades no carrinho (badge da navbar) */
export function useCartCount() {
  const { data } = useCart()
  return data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

/** Grava o carrinho devolvido pela API e recalcula a cotação */
function syncCart(queryClient: QueryClient, cart: Cart) {
  queryClient.setQueryData(cartKeys.all, cart)
  queryClient.invalidateQueries({ queryKey: cartKeys.quote })
}

export interface AddToCartInput {
  nftId: string
  editionId: string
  quantity: number
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const { data } = await api.post<Cart>('/cart/items', input)
      return data
    },
    // A API devolve o carrinho atualizado: o cache (e o badge) reflete na hora
    onSuccess: (cart) => syncCart(queryClient, cart),
  })
}

type ItemChange = { itemId: string; quantity: number } | { itemId: string; remove: true }

/**
 * Alteração de quantidade e remoção com atualização otimista:
 * a interface muda na hora e volta ao estado anterior se a API recusar.
 */
export function useCartItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: cartKeys.mutations.item,
    mutationFn: async (change: ItemChange) => {
      const url = `/cart/items/${encodeURIComponent(change.itemId)}`
      const { data } =
        'remove' in change ? await api.delete<Cart>(url) : await api.patch<Cart>(url, { quantity: change.quantity })
      return data
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.all, exact: true })
      const previous = queryClient.getQueryData<Cart>(cartKeys.all)
      if (previous) {
        queryClient.setQueryData<Cart>(cartKeys.all, {
          ...previous,
          items:
            'remove' in change
              ? previous.items.filter((item) => item.id !== change.itemId)
              : previous.items.map((item) =>
                  item.id === change.itemId ? { ...item, quantity: change.quantity } : item,
                ),
        })
      }
      return { previous }
    },
    onError: (_error, _change, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.all, context.previous)
    },
    onSuccess: (cart) => {
      // Com cliques seguidos, só a última resposta define o estado (evita respostas fora de ordem)
      if (queryClient.isMutating({ mutationKey: cartKeys.mutations.item }) <= 1) {
        queryClient.setQueryData(cartKeys.all, cart)
      }
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: cartKeys.mutations.item }) <= 1) {
        queryClient.invalidateQueries({ queryKey: cartKeys.quote })
      }
    },
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<Cart>('/cart/coupon', { code })
      return data
    },
    onSuccess: (cart) => syncCart(queryClient, cart),
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<Cart>('/cart/coupon')
      return data
    },
    onSuccess: (cart) => syncCart(queryClient, cart),
  })
}

/** O colecionador confirma os novos preços após uma alteração */
export function useConfirmPrices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Cart>('/cart/confirm-prices')
      return data
    },
    onSuccess: (cart) => syncCart(queryClient, cart),
  })
}
