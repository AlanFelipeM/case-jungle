import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Cart } from '@/types'

export const cartKeys = {
  all: ['cart'] as const,
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

/** Total de unidades no carrinho (badge da navbar) */
export function useCartCount() {
  const { data } = useCart()
  return data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
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
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.all, cart),
  })
}
