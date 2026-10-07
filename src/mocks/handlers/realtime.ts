import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NFTUpdatedEvent } from '@/types'
import { MOCK_NFTS } from '@/mocks/fixtures/nfts'
import { SOCKET_URL } from '@/lib/realtime'

/*
 * Servidor Socket.IO simulado pelo MSW (@mswjs/socket.io-binding).
 * As mudanças alteram os próprios fixtures, então REST e eventos ficam consistentes.
 */
const realtime = ws.link(`${SOCKET_URL}/*`)

type Client = ReturnType<typeof toSocketIo>
const clients = new Map<Client, { close: () => void }>()

// Engine.IO: o servidor envia "ping" periodicamente; sem ele o cliente reconecta por timeout
const PING_INTERVAL = 20_000

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL)
    clients.set(io, { close: () => connection.client.close() })
    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      clients.delete(io)
    })
  }),
]

export interface NftUpdatePatch {
  price?: string
  /** Disponibilidade por id ou rótulo da edição (ex.: { '1/50': 0 }) */
  editions?: Record<string, number | null>
}

function broadcast(event: NFTUpdatedEvent) {
  clients.forEach((_, io) => io.client.emit('nft.updated', event))
}

/** Altera um NFT no mock e emite "nft.updated" para os clientes conectados */
export function emitNftUpdate(nftId: string, patch: NftUpdatePatch): NFTUpdatedEvent | null {
  const nft = MOCK_NFTS.find((n) => n.id === nftId)
  if (!nft) return null

  if (patch.price !== undefined) nft.price = patch.price
  for (const edition of nft.editions) {
    const value = patch.editions?.[edition.id] ?? patch.editions?.[edition.label]
    if (value !== undefined) edition.available = value
  }
  nft.version += 1

  const event: NFTUpdatedEvent = {
    id: crypto.randomUUID(),
    resource: 'nft',
    nftId: nft.id,
    version: nft.version,
    price: nft.price,
    editions: nft.editions.map((e) => ({ id: e.id, available: e.available })),
    timestamp: new Date().toISOString(),
  }
  broadcast(event)
  return event
}

/** Reenvia um evento já emitido (cenários de duplicata ou evento antigo) */
export function replayEvent(event: NFTUpdatedEvent) {
  broadcast(event)
}

/** Derruba as conexões abertas (cenário de queda e reconexão) */
export function dropConnections() {
  clients.forEach(({ close }) => close())
}
