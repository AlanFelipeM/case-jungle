import { http, HttpResponse, delay } from 'msw'
import { MAX_QUANTITY_PER_ORDER, type Cart, type CartItem } from '@/types'
import { MOCK_NFTS } from '@/mocks/fixtures/nfts'

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

function writeCart(cart: Cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // sem persistência disponível: o estado vale só para esta resposta
  }
}

interface AddCartItemBody {
  nftId?: string
  editionId?: string
  quantity?: number
}

export const cartHandlers = [
  // GET /api/cart — carrinho atual
  http.get(`${BASE}/cart`, async () => {
    await delay(100)
    return HttpResponse.json(readCart())
  }),

  // POST /api/cart/items — adiciona (ou soma) um NFT/edição ao carrinho
  http.post(`${BASE}/cart/items`, async ({ request }) => {
    await delay(250)
    const { nftId, editionId, quantity } = (await request.json()) as AddCartItemBody

    if (!Number.isInteger(quantity) || (quantity as number) < 1) {
      return HttpResponse.json(
        { error: 'Informe uma quantidade válida.', code: 'VALIDATION_ERROR' },
        { status: 422 },
      )
    }

    const nft = MOCK_NFTS.find((n) => n.id === nftId)
    const edition = nft?.editions.find((e) => e.id === editionId)
    if (!nft || !edition) {
      return HttpResponse.json({ error: 'NFT ou edição não encontrado.', code: 'NOT_FOUND' }, { status: 404 })
    }
    if (edition.available === 0) {
      return HttpResponse.json(
        { error: 'Esta edição está esgotada.', code: 'EDITION_UNAVAILABLE', available: 0 },
        { status: 409 },
      )
    }

    const cart = readCart()
    const existing = cart.items.find((item) => item.nftId === nftId && item.editionId === editionId)
    const limit = Math.min(edition.available ?? Infinity, MAX_QUANTITY_PER_ORDER)
    const inCart = existing?.quantity ?? 0
    if (inCart + (quantity as number) > limit) {
      const remaining = Math.max(limit - inCart, 0)
      return HttpResponse.json(
        {
          error:
            remaining > 0
              ? `Só é possível adicionar mais ${remaining} ${remaining === 1 ? 'unidade' : 'unidades'} desta edição.`
              : 'Você já tem a quantidade máxima desta edição no carrinho.',
          code: 'INSUFFICIENT_AVAILABILITY',
          available: remaining,
        },
        { status: 409 },
      )
    }

    if (existing) {
      existing.quantity += quantity as number
    } else {
      const item: CartItem = {
        nftId: nft.id,
        editionId: edition.id,
        quantity: quantity as number,
        nft,
        edition,
        priceSnapshot: nft.price,
      }
      cart.items.push(item)
    }
    cart.updatedAt = new Date().toISOString()
    writeCart(cart)
    return HttpResponse.json(cart, { status: 201 })
  }),
]
