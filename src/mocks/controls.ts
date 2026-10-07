import { dropConnections, emitNftUpdate, replayEvent } from './handlers/realtime'
import { failNext } from './handlers/failures'
import { resetCart } from './handlers/cart'

/**
 * Controles para demonstração e testes, expostos em window.__kurioMock.
 * Ex.: __kurioMock.emitNftUpdate('nft-001', { price: '1.35', editions: { '1/50': 1 } })
 *      __kurioMock.failNext('PATCH', '/api/cart/items', 503)
 */
export const mockControls = {
  emitNftUpdate,
  replayEvent,
  dropConnections,
  failNext,
  resetCart,
}
