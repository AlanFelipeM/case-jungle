import { http, HttpResponse, delay } from 'msw'
import type {
  CheckoutCollector,
  CheckoutWallet,
  CreateOrderPayload,
  Network,
  Order,
  OrderItem,
  WalletSession,
} from '@/types'
import { DEMO_PROFILE, DEMO_WALLETS } from '@/mocks/fixtures/account'
import { MOCK_NFTS } from '@/mocks/fixtures/nfts'
import { getScenario } from '@/mocks/scenarios'
import { buildQuote, readCart, withCurrentData, writeCart } from './cart'
import { emitNftUpdate, emitOrderUpdate, emitWalletDisconnected } from './realtime'
import { compareEth } from '@/lib/eth'
import { ENS_NAME_PATTERN, stableStringify } from '@/lib/checkout'

const BASE = '/api'
const ORDERS_KEY = 'kurio:mock:orders'

// ─── Validação compartilhada (mesmas regras do formulário) ─────────────────

const ADDRESS_PATTERNS: Record<Network, RegExp> = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
}

export function isValidAddress(address: string, network: Network) {
  return ADDRESS_PATTERNS[network]?.test(address.trim()) ?? false
}

// ─── Pedidos (persistidos para recuperação após refresh) ───────────────────

interface StoredOrder extends Order {
  payloadHash: string
  outcome: 'confirm' | 'reject'
  resolvesAt: number
}

interface OrderStore {
  orders: Record<string, StoredOrder>
  /** chave de idempotência → id do pedido */
  keys: Record<string, string>
}

function readStore(): OrderStore {
  try {
    const stored = localStorage.getItem(ORDERS_KEY)
    if (stored) return JSON.parse(stored) as OrderStore
  } catch {
    // armazenamento indisponível
  }
  return { orders: {}, keys: {} }
}

function writeStore(store: OrderStore) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(store))
  } catch {
    // ignorado
  }
}

export function resetOrders() {
  try {
    localStorage.removeItem(ORDERS_KEY)
  } catch {
    // ignorado
  }
}

function publicOrder(order: StoredOrder): Order {
  const { payloadHash: _hash, outcome: _outcome, resolvesAt: _resolvesAt, ...rest } = order
  return rest
}

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Conclui o pagamento quando chega a hora (estado terminal: confirmado ou recusado) */
function finalize(orderId: string): Order | undefined {
  const store = readStore()
  const order = store.orders[orderId]
  if (!order) return undefined
  if (order.status !== 'pending' || Date.now() < order.resolvesAt) return publicOrder(order)

  if (order.outcome === 'confirm') {
    // Baixa a disponibilidade e remove do carrinho só o que foi comprado
    for (const item of order.items) {
      const edition = MOCK_NFTS.find((n) => n.id === item.nftId)?.editions.find((e) => e.id === item.editionId)
      if (edition && edition.available !== null) {
        emitNftUpdate(item.nftId, { editions: { [item.editionId]: Math.max(edition.available - item.quantity, 0) } })
      }
    }
    const cart = readCart()
    cart.items = cart.items
      .map((ci) => {
        const bought = order.items.find((i) => i.itemId === ci.id)
        return bought ? { ...ci, quantity: ci.quantity - bought.quantity } : ci
      })
      .filter((ci) => ci.quantity > 0)
    if (!cart.items.length) delete cart.couponCode
    writeCart(cart)
    order.status = 'confirmed'
  } else {
    order.status = 'rejected'
    order.failureReason = 'O pagamento foi recusado pela carteira. Nenhum valor foi cobrado e seus itens continuam no carrinho.'
  }
  order.version += 1
  order.updatedAt = new Date().toISOString()
  writeStore(store)
  const result = publicOrder(order)
  emitOrderUpdate(result)
  return result
}

function scheduleFinalize(order: StoredOrder) {
  setTimeout(() => finalize(order.id), Math.max(order.resolvesAt - Date.now(), 0) + 50)
}

// Após um refresh, pedidos pendentes continuam sendo resolvidos
Object.values(readStore().orders)
  .filter((order) => order.status === 'pending')
  .forEach(scheduleFinalize)

// ─── Sessões de carteira ───────────────────────────────────────────────────

const sessions = new Map<string, WalletSession>()

/** Simula a carteira encerrando a conexão (ex.: usuário desconectou na extensão) */
export function disconnectWallets() {
  sessions.forEach((session) => emitWalletDisconnected(session.id))
  sessions.clear()
}

const error = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ error: message, code, ...extra }, { status })

function validateCollector(collector: CheckoutCollector | undefined): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!collector) return { collector: 'Dados do colecionador obrigatórios.' }
  if (!collector.displayName?.trim()) errors.displayName = 'Informe o nome de exibição.'
  if (!/^[a-z0-9_.]{3,20}$/.test(collector.username ?? '')) errors.username = 'Nome de usuário inválido.'
  if (!collector.profileName?.trim()) errors.profileName = 'Informe o nome do perfil.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email ?? '')) errors.email = 'E-mail inválido.'
  if (collector.referralCode && !/^[A-Za-z0-9]{4,12}$/.test(collector.referralCode)) {
    errors.referralCode = 'Código de indicação inválido.'
  }
  if (!ENS_NAME_PATTERN.test(collector.ensName ?? '')) errors.ensName = 'Nome ENS inválido.'
  return errors
}

function validateWallet(wallet: CheckoutWallet | undefined): Record<string, string> {
  if (!wallet) return { wallet: 'Informe a carteira.' }
  const errors: Record<string, string> = {}
  if (!['ethereum', 'polygon', 'solana'].includes(wallet.network)) errors.network = 'Selecione uma rede.'
  else if (!isValidAddress(wallet.address ?? '', wallet.network)) errors.walletAddress = 'Endereço inválido para a rede.'
  if (!['walletconnect', 'metamask', 'coinbase'].includes(wallet.connector)) errors.connector = 'Selecione a carteira.'
  return errors
}

// ─── Handlers ──────────────────────────────────────────────────────────────

export const checkoutHandlers = [
  // GET /api/profile — dados do colecionador
  http.get(`${BASE}/profile`, async () => {
    await delay(150)
    return HttpResponse.json(DEMO_PROFILE)
  }),

  // GET /api/wallets — carteiras cadastradas
  http.get(`${BASE}/wallets`, async () => {
    await delay(150)
    return HttpResponse.json(DEMO_WALLETS)
  }),

  // POST /api/wallet/connect — simula a aprovação (ou recusa) na carteira
  http.post(`${BASE}/wallet/connect`, async ({ request }) => {
    const body = (await request.json()) as Partial<WalletSession>
    await delay(1_200)
    if (!body.connector || !body.network || !body.address || !isValidAddress(body.address, body.network)) {
      return error(422, 'VALIDATION_ERROR', 'Carteira ou rede inválida.')
    }
    if (getScenario().walletConnection === 'reject') {
      return error(403, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    }
    const session: WalletSession = {
      id: crypto.randomUUID(),
      connector: body.connector,
      address: body.address,
      network: body.network,
      connectedAt: new Date().toISOString(),
    }
    sessions.set(session.id, session)
    return HttpResponse.json(session, { status: 201 })
  }),

  // POST /api/wallet/disconnect — encerra a sessão da carteira
  http.post(`${BASE}/wallet/disconnect`, async ({ request }) => {
    const { sessionId } = (await request.json()) as { sessionId?: string }
    if (sessionId) sessions.delete(sessionId)
    return new HttpResponse(null, { status: 204 })
  }),

  // POST /api/orders — criação idempotente com revalidação da cotação
  http.post(`${BASE}/orders`, async ({ request }) => {
    const key = request.headers.get('Idempotency-Key')
    if (!key) return error(422, 'IDEMPOTENCY_KEY_REQUIRED', 'Chave de idempotência obrigatória.')
    const payload = (await request.json()) as CreateOrderPayload
    const { walletSessionId, ...content } = payload
    const payloadHash = stableStringify(content)

    // Mesma tentativa → mesmo pedido; mesma chave com outro conteúdo → conflito
    const store = readStore()
    const existingId = store.keys[key]
    if (existingId) {
      const existing = store.orders[existingId]
      if (existing.payloadHash !== payloadHash) {
        return error(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave já foi usada em um pedido diferente.')
      }
      await delay(200)
      return HttpResponse.json(finalize(existingId), { status: 200 })
    }

    await delay(300)
    if (!walletSessionId || !sessions.has(walletSessionId)) {
      return error(409, 'WALLET_NOT_CONNECTED', 'A carteira foi desconectada. Conecte novamente para continuar.')
    }
    const fieldErrors = { ...validateCollector(payload.collector), ...validateWallet(payload.wallet) }
    if (Object.keys(fieldErrors).length) {
      return error(422, 'VALIDATION_ERROR', 'Revise os dados do pedido.', { fieldErrors })
    }

    // Revalidação: itens, preços, disponibilidade, cupom e total
    const cart = withCurrentData(readCart())
    const quote = buildQuote(readCart())
    const sameItems =
      cart.items.length === payload.items.length &&
      payload.items.every((p) => {
        const item = cart.items.find((i) => i.id === p.itemId)
        return item && item.quantity === p.quantity && compareEth(item.nft.price, p.unitPrice) === 0
      })
    const changed =
      !cart.items.length ||
      !sameItems ||
      quote.lines.some((l) => l.exceedsAvailability) ||
      (payload.couponCode ?? null) !== (quote.coupon?.code ?? null) ||
      compareEth(payload.expectedTotal, quote.total) !== 0
    if (changed) {
      return error(409, 'QUOTE_CHANGED', 'Os valores do pedido mudaram. Revise e confirme novamente.', { quote })
    }

    const scenario = getScenario()
    const now = new Date().toISOString()
    const items: OrderItem[] = cart.items.map((item) => ({
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.nft.name,
      image: item.nft.image,
      tokenId: item.nft.tokenId,
      editionLabel: item.edition.label,
      quantity: item.quantity,
      unitPrice: item.nft.price,
      total: quote.lines.find((l) => l.itemId === item.id)!.total,
    }))
    const order: StoredOrder = {
      id: `ord-${randomHex(5)}`,
      idempotencyKey: key,
      status: 'pending',
      items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      couponCode: quote.coupon?.code,
      collector: payload.collector,
      wallet: payload.wallet,
      transactionRef: `0x${randomHex(32)}`,
      version: 1,
      createdAt: now,
      updatedAt: now,
      payloadHash,
      outcome: scenario.payment,
      resolvesAt: Date.now() + scenario.paymentDelayMs,
    }
    store.orders[order.id] = order
    store.keys[key] = order.id
    writeStore(store)
    scheduleFinalize(order)

    // O pedido já existe: se a resposta demorar (timeout), um novo envio com a mesma chave o recupera
    await delay(scenario.orderResponseDelayMs)
    return HttpResponse.json(finalize(order.id), { status: 201 })
  }),

  // GET /api/orders/:id — estado e recibo do pedido
  http.get(`${BASE}/orders/:id`, async ({ params }) => {
    await delay(150)
    const order = finalize(String(params.id))
    if (!order) return error(404, 'NOT_FOUND', 'Pedido não encontrado.')
    return HttpResponse.json(order)
  }),
]
