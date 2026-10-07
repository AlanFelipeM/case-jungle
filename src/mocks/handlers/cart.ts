import { http, HttpResponse, delay } from 'msw'
import { MAX_QUANTITY_PER_ORDER, type Cart, type CartItem, type Quote, type QuoteLine } from '@/types'
import { MOCK_NFTS } from '@/mocks/fixtures/nfts'
import { addEth, compareEth, fromWei, mulEth, percentOfEth, toWei } from '@/lib/eth'

const BASE = '/api'
const STORAGE_KEY = 'kurio:mock:cart'
const NETWORK_FEE = '0.016'
const QUOTE_TTL_MS = 5 * 60_000

/** Cupons simulados (o código é comparado sem diferenciar maiúsculas) */
const COUPONS: Record<string, { percent: number; expiresAt: string }> = {
  KURIO10: { percent: 10, expiresAt: '2030-12-31T23:59:59Z' },
  GENESIS5: { percent: 5, expiresAt: '2030-12-31T23:59:59Z' },
  LANCAMENTO: { percent: 15, expiresAt: '2026-01-01T00:00:00Z' },
}

const itemId = (nftId: string, editionId: string) => `${nftId}:${editionId}`

function validCoupon(code: string | undefined) {
  const coupon = code ? COUPONS[code] : undefined
  return coupon && new Date(coupon.expiresAt).getTime() > Date.now() ? { code: code!, percent: coupon.percent } : null
}

// ─── Persistência ──────────────────────────────────────────────────────────

/** Estado do carrinho do visitante, persistido para sobreviver a refresh */
function readCart(): Cart {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const cart = JSON.parse(stored) as Cart
      // Carrinhos salvos antes do campo "id" nos itens
      cart.items = cart.items.map((item) => ({ ...item, id: item.id ?? itemId(item.nftId, item.editionId) }))
      return cart
    }
  } catch {
    // armazenamento indisponível ou corrompido: volta ao cenário padrão
  }
  return { id: 'cart-guest', items: [], updatedAt: new Date(0).toISOString() }
}

function writeCart(cart: Cart) {
  cart.updatedAt = new Date().toISOString()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // sem persistência disponível: o estado vale só para esta resposta
  }
}

/** Reinicia o carrinho (reset de cenário) */
export function resetCart() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorado
  }
}

/** Itens com os dados atuais do catálogo (REST reflete preço e disponibilidade vigentes) */
function withCurrentData(cart: Cart): Cart {
  return {
    ...cart,
    items: cart.items.flatMap((item) => {
      const nft = MOCK_NFTS.find((n) => n.id === item.nftId)
      const edition = nft?.editions.find((e) => e.id === item.editionId)
      return nft && edition ? [{ ...item, nft, edition }] : []
    }),
  }
}

function buildQuote(cart: Cart): Quote {
  const lines: QuoteLine[] = withCurrentData(cart).items.map((item) => {
    const available = item.edition.available
    return {
      itemId: item.id,
      unitPrice: item.nft.price,
      quantity: item.quantity,
      total: mulEth(item.nft.price, item.quantity),
      previousPrice: item.priceSnapshot,
      priceChanged: compareEth(item.nft.price, item.priceSnapshot) !== 0,
      available,
      exceedsAvailability: available !== null && item.quantity > available,
    }
  })
  const subtotal = lines.length ? addEth(...lines.map((l) => l.total)) : '0.00'
  const coupon = validCoupon(cart.couponCode)
  const discount = coupon ? percentOfEth(subtotal, coupon.percent) : '0.00'
  const networkFee = lines.length ? NETWORK_FEE : '0.00'
  return {
    lines,
    subtotal,
    discount,
    networkFee,
    total: fromWei(toWei(subtotal) - toWei(discount) + toWei(networkFee)),
    coupon,
    couponValid: !cart.couponCode || coupon !== null,
    hasIssues: lines.some((l) => l.priceChanged || l.exceedsAvailability),
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
}

const error = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ error: message, code, ...extra }, { status })

function quantityLimit(available: number | null) {
  return Math.min(available ?? Infinity, MAX_QUANTITY_PER_ORDER)
}

interface AddCartItemBody {
  nftId?: string
  editionId?: string
  quantity?: number
}

// ─── Handlers ──────────────────────────────────────────────────────────────

export const cartHandlers = [
  // GET /api/cart — carrinho atual
  http.get(`${BASE}/cart`, async () => {
    await delay(100)
    return HttpResponse.json(withCurrentData(readCart()))
  }),

  // GET /api/cart/quote — subtotal, desconto, taxa e total com os preços atuais
  http.get(`${BASE}/cart/quote`, async () => {
    await delay(150)
    return HttpResponse.json(buildQuote(readCart()))
  }),

  // POST /api/cart/items — adiciona (ou soma) um NFT/edição ao carrinho
  http.post(`${BASE}/cart/items`, async ({ request }) => {
    await delay(250)
    const { nftId, editionId, quantity } = (await request.json()) as AddCartItemBody

    if (!Number.isInteger(quantity) || (quantity as number) < 1) {
      return error(422, 'VALIDATION_ERROR', 'Informe uma quantidade válida.')
    }
    const nft = MOCK_NFTS.find((n) => n.id === nftId)
    const edition = nft?.editions.find((e) => e.id === editionId)
    if (!nft || !edition) return error(404, 'NOT_FOUND', 'NFT ou edição não encontrado.')
    if (edition.available === 0) {
      return error(409, 'EDITION_UNAVAILABLE', 'Esta edição está esgotada.', { available: 0 })
    }

    const cart = readCart()
    const existing = cart.items.find((item) => item.id === itemId(nft.id, edition.id))
    const limit = quantityLimit(edition.available)
    const inCart = existing?.quantity ?? 0
    if (inCart + (quantity as number) > limit) {
      const remaining = Math.max(limit - inCart, 0)
      return error(
        409,
        'INSUFFICIENT_AVAILABILITY',
        remaining > 0
          ? `Só é possível adicionar mais ${remaining} ${remaining === 1 ? 'unidade' : 'unidades'} desta edição.`
          : 'Você já tem a quantidade máxima desta edição no carrinho.',
        { available: remaining },
      )
    }

    if (existing) {
      existing.quantity += quantity as number
    } else {
      const item: CartItem = {
        id: itemId(nft.id, edition.id),
        nftId: nft.id,
        editionId: edition.id,
        quantity: quantity as number,
        nft,
        edition,
        priceSnapshot: nft.price,
      }
      cart.items.push(item)
    }
    writeCart(cart)
    return HttpResponse.json(withCurrentData(cart), { status: 201 })
  }),

  // PATCH /api/cart/items/:id — altera a quantidade
  http.patch(`${BASE}/cart/items/:id`, async ({ request, params }) => {
    await delay(250)
    const { quantity } = (await request.json()) as { quantity?: number }
    if (!Number.isInteger(quantity) || (quantity as number) < 1) {
      return error(422, 'VALIDATION_ERROR', 'Informe uma quantidade válida.')
    }
    const cart = readCart()
    const item = cart.items.find((i) => i.id === params.id)
    const edition = MOCK_NFTS.find((n) => n.id === item?.nftId)?.editions.find((e) => e.id === item?.editionId)
    if (!item || !edition) return error(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')

    const limit = quantityLimit(edition.available)
    // Reduzir é sempre permitido (inclusive quando o estoque caiu abaixo da quantidade)
    if ((quantity as number) > limit && (quantity as number) > item.quantity) {
      return error(
        409,
        'INSUFFICIENT_AVAILABILITY',
        limit > 0
          ? `Quantidade máxima disponível para esta edição: ${limit}.`
          : 'Esta edição esgotou. Remova o item para continuar.',
        { available: limit },
      )
    }
    item.quantity = quantity as number
    writeCart(cart)
    return HttpResponse.json(withCurrentData(cart))
  }),

  // DELETE /api/cart/items/:id — remove o item
  http.delete(`${BASE}/cart/items/:id`, async ({ params }) => {
    await delay(200)
    const cart = readCart()
    if (!cart.items.some((i) => i.id === params.id)) {
      return error(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    }
    cart.items = cart.items.filter((i) => i.id !== params.id)
    writeCart(cart)
    return HttpResponse.json(withCurrentData(cart))
  }),

  // POST /api/cart/coupon — aplica um cupom
  http.post(`${BASE}/cart/coupon`, async ({ request }) => {
    await delay(300)
    const { code } = (await request.json()) as { code?: string }
    const normalized = code?.trim().toUpperCase() ?? ''
    if (!normalized) return error(422, 'VALIDATION_ERROR', 'Digite um código promocional.')
    const coupon = COUPONS[normalized]
    if (!coupon) return error(422, 'COUPON_INVALID', 'Código promocional inválido.')
    if (new Date(coupon.expiresAt).getTime() <= Date.now()) {
      return error(422, 'COUPON_EXPIRED', 'Este código promocional expirou.')
    }
    const cart = readCart()
    if (!cart.items.length) return error(422, 'CART_EMPTY', 'Adicione itens ao carrinho antes de aplicar um código.')
    cart.couponCode = normalized
    writeCart(cart)
    return HttpResponse.json(withCurrentData(cart))
  }),

  // DELETE /api/cart/coupon — remove o cupom
  http.delete(`${BASE}/cart/coupon`, async () => {
    await delay(200)
    const cart = readCart()
    delete cart.couponCode
    writeCart(cart)
    return HttpResponse.json(withCurrentData(cart))
  }),

  // POST /api/cart/confirm-prices — o colecionador aceita os preços atuais
  http.post(`${BASE}/cart/confirm-prices`, async () => {
    await delay(200)
    const cart = withCurrentData(readCart())
    cart.items = cart.items.map((item) => ({ ...item, priceSnapshot: item.nft.price }))
    writeCart(cart)
    return HttpResponse.json(cart)
  }),
]
