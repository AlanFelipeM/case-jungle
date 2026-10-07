import type { Socket } from 'socket.io-client'
import type { NFTUpdatedEvent, OrderUpdatedEvent } from '@/types'
import { getToken } from '@/lib/session'

/** Endereço do servidor de eventos (interceptado pelo MSW no ambiente de mocks) */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.app'

export interface ServerToClientEvents {
  'nft.updated': (event: NFTUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
  'wallet.disconnected': (event: { sessionId: string }) => void
}

let current: { token: string | null; socket: Promise<Socket<ServerToClientEvents>> } | null = null

/**
 * Conexão compartilhada pela aplicação, vinculada à sessão atual (token no handshake).
 * Ao trocar de usuário a conexão anterior é encerrada: eventos de outra sessão não chegam.
 * O socket.io-client é carregado sob demanda: ele guarda a referência do WebSocket
 * ao ser importado, então precisa carregar depois que o MSW instala a interceptação.
 */
export function getSocket(): Promise<Socket<ServerToClientEvents>> {
  const token = getToken()
  if (current && current.token === token) return current.socket
  current?.socket.then((socket) => socket.disconnect())
  const socket = import('socket.io-client').then(({ io }) =>
    io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
      query: token ? { token } : {},
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    }),
  )
  current = { token, socket }
  return socket
}
