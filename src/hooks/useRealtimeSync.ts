import React from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Cart, NFT, NFTListResponse, NFTUpdatedEvent } from '@/types'
import { getSocket } from '@/lib/realtime'
import { nftKeys } from '@/hooks/useNFTs'
import { cartKeys } from '@/hooks/useCart'

const MAX_SEEN_EVENTS = 500

/**
 * Aplica um evento ao NFT se ele for mais novo que o dado em cache.
 * Versões iguais ou menores são ignoradas: o estado nunca regride.
 */
export function applyNftEvent(nft: NFT, event: NFTUpdatedEvent): NFT {
  if (nft.id !== event.nftId || event.version <= nft.version) return nft
  const availability = new Map(event.editions.map((e) => [e.id, e.available]))
  return {
    ...nft,
    price: event.price,
    version: event.version,
    editions: nft.editions.map((edition) =>
      availability.has(edition.id) ? { ...edition, available: availability.get(edition.id)! } : edition,
    ),
  }
}

/** Atualiza todas as consultas que contêm o NFT (detalhe, listas, carrosséis, destaque e carrinho) */
function updateCaches(queryClient: QueryClient, event: NFTUpdatedEvent) {
  const patch = (nft: NFT) => applyNftEvent(nft, event)

  queryClient.setQueryData<NFT>(nftKeys.detail(event.nftId), (nft) => nft && patch(nft))
  queryClient.setQueryData<NFT>(nftKeys.featured, (nft) => nft && patch(nft))
  queryClient.setQueriesData<NFTListResponse>({ queryKey: ['nfts', 'list'] }, (list) =>
    list ? { ...list, data: list.data.map(patch) } : list,
  )
  queryClient.setQueriesData<NFT[]>({ queryKey: ['nfts', 'collection'] }, (items) => items?.map(patch))
  // No carrinho, o preço de referência (priceSnapshot) é mantido para comparação
  queryClient.setQueryData<Cart>(cartKeys.all, (cart) =>
    cart
      ? {
          ...cart,
          items: cart.items.map((item) => {
            if (item.nftId !== event.nftId) return item
            const nft = patch(item.nft)
            return { ...item, nft, edition: nft.editions.find((e) => e.id === item.editionId) ?? item.edition }
          }),
        }
      : cart,
  )
}

/**
 * Conecta ao Socket.IO e sincroniza o cache com os eventos de tempo real.
 * Tolera eventos duplicados ou antigos e reconcilia com a API REST após reconectar.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    let cancelled = false
    let cleanup = () => {}
    const seen = new Set<string>()
    const latestVersion = new Map<string, number>()

    const onNftUpdated = (event: NFTUpdatedEvent) => {
      if (seen.has(event.id) || event.version <= (latestVersion.get(event.nftId) ?? 0)) return
      seen.add(event.id)
      if (seen.size > MAX_SEEN_EVENTS) seen.delete(seen.values().next().value!)
      latestVersion.set(event.nftId, event.version)
      updateCaches(queryClient, event)
    }

    // Eventos podem ter sido perdidos enquanto a conexão estava fora: busca o estado atual
    const onReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: cartKeys.all })
    }

    getSocket().then((socket) => {
      if (cancelled) return
      socket.on('nft.updated', onNftUpdated)
      socket.io.on('reconnect', onReconnect)
      socket.connect()
      cleanup = () => {
        socket.off('nft.updated', onNftUpdated)
        socket.io.off('reconnect', onReconnect)
        socket.disconnect()
      }
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [queryClient])
}
