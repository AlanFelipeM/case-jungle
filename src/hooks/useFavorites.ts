import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { useSession } from '@/hooks/useAuth'

export const favoriteKeys = { all: ['favorites'] as const }

export function useFavorites() {
  const { isAuthenticated } = useSession()
  return useQuery({
    queryKey: favoriteKeys.all,
    queryFn: async ({ signal }) => (await api.get<string[]>('/favorites', { signal })).data,
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

/**
 * Favoritar com atualização otimista: o coração muda na hora e volta
 * ao estado anterior se a API falhar.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      (favorite ? await api.put<string[]>(`/favorites/${nftId}`) : await api.delete<string[]>(`/favorites/${nftId}`)).data,
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all })
      const previous = queryClient.getQueryData<string[]>(favoriteKeys.all)
      queryClient.setQueryData<string[]>(favoriteKeys.all, (ids = []) =>
        favorite ? [...new Set([...ids, nftId])] : ids.filter((id) => id !== nftId),
      )
      return { previous }
    },
    onError: (error, { favorite, name }, context) => {
      queryClient.setQueryData(favoriteKeys.all, context?.previous)
      toast(
        `${getErrorMessage(error, `Não foi possível ${favorite ? 'favoritar' : 'remover'} ${name}.`)} A alteração foi desfeita.`,
        'error',
      )
    },
    onSuccess: (ids, { favorite, name }) => {
      queryClient.setQueryData(favoriteKeys.all, ids)
      toast(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`, 'success')
    },
  })
}

/** Estado e ação de favoritar um NFT (pede login quando não há sessão) */
export function useFavorite(nft: { id: string; name: string }, openAuth: () => void) {
  const { isAuthenticated } = useSession()
  const { data: favorites = [] } = useFavorites()
  const toggle = useToggleFavorite()
  const isFavorite = isAuthenticated && favorites.includes(nft.id)
  return {
    isFavorite,
    label: isAuthenticated
      ? `${isFavorite ? 'Remover' : 'Adicionar'} ${nft.name} ${isFavorite ? 'dos' : 'aos'} favoritos`
      : `Favoritar ${nft.name} (requer login)`,
    toggle: () => {
      if (!isAuthenticated) return openAuth()
      toggle.mutate({ nftId: nft.id, favorite: !isFavorite, name: nft.name })
    },
  }
}
