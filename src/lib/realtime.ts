import type { Socket } from 'socket.io-client'
import type { NFTUpdatedEvent, OrderUpdatedEvent } from '@/types'

/** Endereço do servidor de eventos (interceptado pelo MSW no ambiente de mocks) */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.app'

export interface ServerToClientEvents {
  'nft.updated': (event: NFTUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
  'wallet.disconnected': (event: { sessionId: string }) => void
}

let socketPromise: Promise<Socket<ServerToClientEvents>> | null = null

/**
 * Conexão única compartilhada pela aplicação.
 * O socket.io-client é carregado sob demanda: ele guarda a referência do WebSocket
 * ao ser importado, então precisa carregar depois que o MSW instala a interceptação.
 */
export function getSocket(): Promise<Socket<ServerToClientEvents>> {
  socketPromise ??= import('socket.io-client').then(({ io }) =>
    io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    }),
  )
  return socketPromise
}
