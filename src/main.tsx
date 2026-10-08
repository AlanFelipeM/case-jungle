/*
 * Ponto de entrada enxuto: a aplicação e a camada de mocks (MSW) baixam em paralelo.
 * A interface só renderiza depois que o MSW intercepta a rede, para que nenhuma
 * requisição escape para o servidor real.
 */
const mocksEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'true'

async function enableMocks() {
  if (!mocksEnabled) return
  const { worker } = await import('@/mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
  const { mockControls } = await import('@/mocks/controls')
  window.__kurioMock = mockControls
}

async function bootstrap() {
  const [{ renderApp }] = await Promise.all([import('./app'), enableMocks()])
  renderApp()
}

bootstrap()
