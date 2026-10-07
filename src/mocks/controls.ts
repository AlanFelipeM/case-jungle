import { dropConnections, emitNftUpdate, replayEvent, replayOrderEvent } from './handlers/realtime'
import { failNext } from './handlers/failures'
import { resetCart } from './handlers/cart'
import { disconnectWallets, resetOrders } from './handlers/checkout'
import { getScenario, resetScenario, setScenario } from './scenarios'

/**
 * Controles para demonstração e testes, expostos em window.__kurioMock.
 * Ex.: __kurioMock.emitNftUpdate('nft-001', { price: '1.35', editions: { '1/50': 1 } })
 *      __kurioMock.failNext('PATCH', '/api/cart/items', 503)
 *      __kurioMock.setScenario({ payment: 'reject' })
 */
export const mockControls = {
  // tempo real
  emitNftUpdate,
  replayEvent,
  replayOrderEvent,
  dropConnections,
  // falhas e cenários
  failNext,
  getScenario,
  setScenario,
  disconnectWallets,
  // reset do cenário conhecido
  resetCart,
  resetOrders,
  resetScenario,
  resetAll: () => {
    resetCart()
    resetOrders()
    resetScenario()
  },
}
