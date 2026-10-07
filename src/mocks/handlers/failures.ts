import { http, HttpResponse, delay } from 'msw'

/*
 * Injeção de falhas reproduzível: a próxima requisição que casar com método e
 * caminho recebe o status informado. Registrado antes dos demais handlers.
 */
interface PendingFailure {
  method: string
  path: string
  status: number
}

const pending: PendingFailure[] = []

export function failNext(method: string, path: string, status = 503) {
  pending.push({ method: method.toUpperCase(), path, status })
}

export const failureHandlers = [
  http.all('/api/*', async ({ request }) => {
    const { pathname } = new URL(request.url)
    const index = pending.findIndex((f) => f.method === request.method && pathname.startsWith(f.path))
    if (index === -1) return undefined // segue para o handler real
    const [failure] = pending.splice(index, 1)
    await delay(300)
    return HttpResponse.json(
      { error: 'Falha temporária no servidor. Tente novamente.', code: 'TRANSIENT_ERROR' },
      { status: failure.status },
    )
  }),
]
