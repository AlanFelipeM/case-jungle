import React from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Cart, NFT, NFTListResponse, NFTUpdatedEvent, Order, OrderUpdatedEvent } from '@/types'
import { getSocket } from '@/lib/realtime'
import { useToken } from '@/lib/session'
import { nftKeys } from '@/hooks/useNFTs'
import { cartKeys } from '@/hooks/useCart'
import { checkoutKeys } from '@/hooks/useCheckout'

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
  // NFT no carrinho mudou: a cotação (subtotal, total e avisos) vem de novo da API
  const cart = queryClient.getQueryData<Cart>(cartKeys.all)
  if (cart?.items.some((item) => item.nftId === event.nftId)) {
    queryClient.invalidateQueries({ queryKey: cartKeys.quote })
  }
}

/**
 * Conecta ao Socket.IO e sincroniza o cache com os eventos de tempo real.
 * Tolera eventos duplicados ou antigos e reconcilia com a API REST após reconectar.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  // Nova sessão (login, logout, troca de usuário) → nova conexão
  const token = useToken()

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

    const latestOrderVersion = new Map<string, number>()
    const onOrderUpdated = (event: OrderUpdatedEvent) => {
      if (seen.has(event.id) || event.version <= (latestOrderVersion.get(event.orderId) ?? 0)) return
      seen.add(event.id)
      latestOrderVersion.set(event.orderId, event.version)
      const key = checkoutKeys.order(event.orderId)
      const cached = queryClient.getQueryData<Order>(key)
      // Estados terminais não regridem: só aplica versões mais novas que a do cache
      if (cached && event.version > cached.version) {
        queryClient.setQueryData<Order>(key, { ...cached, status: event.status, version: event.version })
      }
      // O recibo completo vem da API
      queryClient.invalidateQueries({ queryKey: key })
      if (event.status === 'confirmed') queryClient.invalidateQueries({ queryKey: cartKeys.all })
    }

    // Eventos podem ter sido perdidos enquanto a conexão estava fora: busca o estado atual
    const onReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: cartKeys.all })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }

    getSocket().then((socket) => {
      if (cancelled) return
      socket.on('nft.updated', onNftUpdated)
      socket.on('order.updated', onOrderUpdated)
      socket.io.on('reconnect', onReconnect)
      socket.connect()
      cleanup = () => {
        socket.off('nft.updated', onNftUpdated)
        socket.off('order.updated', onOrderUpdated)
        socket.io.off('reconnect', onReconnect)
        socket.disconnect()
      }
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [queryClient, token])
}
