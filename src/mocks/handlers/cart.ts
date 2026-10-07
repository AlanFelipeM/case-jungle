import { http, HttpResponse, delay } from 'msw'
import type { Cart } from '@/types'

const BASE = '/api'
const STORAGE_KEY = 'kurio:mock:cart'

// Estado do carrinho do visitante, persistido para sobreviver a refresh
function readCart(): Cart {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Cart
  } catch {
    // armazenamento indisponível ou corrompido: volta ao cenário padrão
  }
  return { id: 'cart-guest', items: [], updatedAt: new Date(0).toISOString() }
}

export const cartHandlers = [
  // GET /api/cart — carrinho atual
  http.get(`${BASE}/cart`, async () => {
    await delay(100)
    return HttpResponse.json(readCart())
  }),
]
