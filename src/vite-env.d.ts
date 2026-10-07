/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ativa os mocks (MSW) fora do modo de desenvolvimento, ex.: build de demonstração */
  readonly VITE_ENABLE_MSW?: string
  /** Endereço do servidor Socket.IO */
  readonly VITE_SOCKET_URL?: string
}

interface Window {
  /** Controles dos cenários simulados (disponível apenas com os mocks ativos) */
  __kurioMock?: typeof import('@/mocks/controls').mockControls
}
