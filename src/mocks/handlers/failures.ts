import { http, HttpResponse, delay } from 'msw'
import { getScenario } from '@/mocks/scenarios'

/*
 * Condições de rede reproduzíveis, registradas antes dos demais handlers:
 * - latência extra (com variação) configurada no cenário;
 * - falha agendada: a próxima requisição que casar com método e caminho recebe
 *   o status informado ou, com 'network', uma falha de conexão.
 * As falhas agendadas ficam persistidas: valem também para a próxima carga da página.
 */
interface PendingFailure {
  method: string
  path: string
  status: number | 'network'
}

const FAILURES_KEY = 'kurio:mock:failures'

function readPending(): PendingFailure[] {
  try {
    return JSON.parse(localStorage.getItem(FAILURES_KEY) ?? '[]') as PendingFailure[]
  } catch {
    return []
  }
}

function writePending(pending: PendingFailure[]) {
  try {
    if (pending.length) localStorage.setItem(FAILURES_KEY, JSON.stringify(pending))
    else localStorage.removeItem(FAILURES_KEY)
  } catch {
    // ignorado
  }
}

export function failNext(method: string, path: string, status: number | 'network' = 503) {
  writePending([...readPending(), { method: method.toUpperCase(), path, status }])
}

export function resetFailures() {
  writePending([])
}

export const failureHandlers = [
  http.all('/api/*', async ({ request }) => {
    const { networkLatencyMs, latencyJitterMs } = getScenario()
    if (networkLatencyMs || latencyJitterMs) await delay(networkLatencyMs + Math.random() * latencyJitterMs)

    const { pathname } = new URL(request.url)
    const pending = readPending()
    const index = pending.findIndex((f) => f.method === request.method && pathname.startsWith(f.path))
    if (index === -1) return undefined // segue para o handler real
    const [failure] = pending.splice(index, 1)
    writePending(pending)
    await delay(300)
    if (failure.status === 'network') return HttpResponse.error()
    return HttpResponse.json(
      { error: 'Falha temporária no servidor. Tente novamente.', code: 'TRANSIENT_ERROR' },
      { status: failure.status },
    )
  }),
]
