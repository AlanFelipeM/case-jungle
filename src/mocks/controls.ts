import { dropConnections, emitNftUpdate, getConnections, replayEvent, replayOrderEvent } from './handlers/realtime'
import { failNext, resetFailures } from './handlers/failures'
import { resetCart } from './handlers/cart'
import { disconnectWallets, resetOrders } from './handlers/checkout'
import { expireSessions, resetAuth } from './auth'
import { getScenario, resetScenario, setScenario } from './scenarios'

/**
 * Controles para demonstração e testes, expostos em window.__kurioMock.
 * Ex.: __kurioMock.emitNftUpdate('nft-001', { price: '1.35', editions: { '1/50': 1 } })
 *      __kurioMock.failNext('PATCH', '/api/cart/items', 503)
 *      __kurioMock.setScenario({ payment: 'reject' })
 *      __kurioMock.expireSession()
 */
export const mockControls = {
  // tempo real
  emitNftUpdate,
  replayEvent,
  replayOrderEvent,
  dropConnections,
  getConnections,
  // falhas e cenários
  failNext,
  getScenario,
  setScenario,
  disconnectWallets,
  /** Expira a sessão atual: a próxima requisição autenticada recebe 401 */
  expireSession: expireSessions,
  // reset do cenário conhecido
  resetCart,
  resetOrders,
  resetScenario,
  resetFailures,
  resetAll: () => {
    resetFailures()
    resetCart()
    resetOrders()
    resetScenario()
    resetAuth()
  },
}
