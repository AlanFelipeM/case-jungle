import { dropConnections, emitNftUpdate, replayEvent } from './handlers/realtime'

/**
 * Controles para demonstração e testes, expostos em window.__kurioMock.
 * Ex.: __kurioMock.emitNftUpdate('nft-001', { price: '1.35', editions: { '1/50': 1 } })
 */
export const mockControls = {
  emitNftUpdate,
  replayEvent,
  dropConnections,
}
