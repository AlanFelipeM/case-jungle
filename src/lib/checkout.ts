import type { CheckoutCollector, CheckoutWallet, CreateOrderPayload, Network, Quote, Wallet, WalletConnector } from '@/types'

// ─── Formulário ────────────────────────────────────────────────────────────

export interface CheckoutForm {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  referralCode: string
  note: string
  /** false: usa uma carteira cadastrada; true: informa outra carteira */
  useOtherWallet: boolean
  walletId: string
  network: Network | ''
  walletAddress: string
  secondary: string
  connector: WalletConnector | ''
}

export type CheckoutField = keyof CheckoutForm
export type CheckoutErrors = Partial<Record<CheckoutField, string>>

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const CONNECTOR_LABELS: Record<WalletConnector, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

/** Nome ENS sem o sufixo .eth; aceita subdomínios (ex.: nova.kurio) */
export const ENS_NAME_PATTERN = /^(?=.{3,32}$)[a-z0-9-]+(\.[a-z0-9-]+)*$/

const ADDRESS_PATTERNS: Record<Network, RegExp> = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
}

export const isValidAddress = (address: string, network: Network) => ADDRESS_PATTERNS[network].test(address.trim())

/** Carteira efetiva: a cadastrada selecionada ou a informada manualmente */
export function resolveWallet(form: CheckoutForm, wallets: Wallet[]) {
  if (form.useOtherWallet) return { address: form.walletAddress.trim(), network: form.network }
  const wallet = wallets.find((w) => w.id === form.walletId)
  return { address: wallet?.address ?? '', network: wallet?.network ?? ('' as const) }
}

/** Mesmas regras usadas pela API (mocks/handlers/checkout.ts) */
export function validateCheckout(form: CheckoutForm, wallets: Wallet[]): CheckoutErrors {
  const errors: CheckoutErrors = {}
  if (!form.displayName.trim()) errors.displayName = 'Informe o nome de exibição.'
  if (!form.username.trim()) errors.username = 'Informe o nome de usuário.'
  else if (!/^[a-z0-9_.]{3,20}$/.test(form.username))
    errors.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.'
  if (!form.profileName.trim()) errors.profileName = 'Informe o nome do perfil.'
  if (!form.email.trim()) errors.email = 'Informe o e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Informe um e-mail válido.'
  if (!form.ensName.trim()) errors.ensName = 'Informe o nome ENS.'
  else if (!ENS_NAME_PATTERN.test(form.ensName))
    errors.ensName = 'Use de 3 a 32 caracteres: letras minúsculas, números, hífen ou ponto (subdomínio).'
  if (form.referralCode && !/^[A-Za-z0-9]{4,12}$/.test(form.referralCode))
    errors.referralCode = 'O código deve ter de 4 a 12 letras ou números.'
  if (form.note.length > 280) errors.note = 'Use no máximo 280 caracteres.'
  if (!form.connector) errors.connector = 'Selecione a carteira para pagamento.'

  if (form.useOtherWallet) {
    if (!form.network) errors.network = 'Selecione uma rede.'
    if (!form.walletAddress.trim()) errors.walletAddress = 'Informe o endereço da carteira.'
    else if (form.network && !ADDRESS_PATTERNS[form.network].test(form.walletAddress.trim()))
      errors.walletAddress =
        form.network === 'solana' ? 'Endereço Solana inválido.' : 'O endereço deve começar com 0x e ter 42 caracteres.'
    if (form.secondary && !/^(0x[a-fA-F0-9]{40}|[a-z0-9-]+(\.[a-z0-9-]+)*\.eth)$/.test(form.secondary.trim()))
      errors.secondary = 'Informe um nome .eth ou um endereço 0x válido.'
  } else if (!wallets.some((w) => w.id === form.walletId)) {
    errors.walletAddress = 'Selecione uma carteira cadastrada.'
  }
  return errors
}

export function buildPayload(
  form: CheckoutForm,
  wallets: Wallet[],
  quote: Quote,
  walletSessionId: string,
): CreateOrderPayload {
  const { address, network } = resolveWallet(form, wallets)
  const collector: CheckoutCollector = {
    displayName: form.displayName.trim(),
    username: form.username.trim(),
    profileName: form.profileName.trim(),
    email: form.email.trim(),
    ensName: form.ensName.trim(),
    referralCode: form.referralCode.trim(),
    note: form.note.trim() || undefined,
  }
  const wallet: CheckoutWallet = {
    walletId: form.useOtherWallet ? undefined : form.walletId,
    address,
    network: network as Network,
    connector: form.connector as WalletConnector,
    secondary: form.useOtherWallet ? form.secondary.trim() || undefined : undefined,
  }
  return {
    items: quote.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice })),
    couponCode: quote.coupon?.code,
    expectedTotal: quote.total,
    collector,
    wallet,
    walletSessionId,
  }
}

// ─── Tentativa de compra (idempotência e recuperação após refresh) ─────────

/** JSON com chaves ordenadas: o mesmo conteúdo gera sempre o mesmo hash */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .filter((k) => record[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export interface CheckoutAttempt {
  idempotencyKey: string
  /** Conteúdo do pedido (sem a sessão da carteira) */
  payloadHash: string
  orderId?: string
}

const ATTEMPT_KEY = 'kurio:checkout:attempt'

export function loadAttempt(): CheckoutAttempt | null {
  try {
    const stored = localStorage.getItem(ATTEMPT_KEY)
    return stored ? (JSON.parse(stored) as CheckoutAttempt) : null
  } catch {
    return null
  }
}

export function saveAttempt(attempt: CheckoutAttempt) {
  try {
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt))
  } catch {
    // sem persistência: a idempotência continua valendo na sessão atual
  }
}

export function clearAttempt() {
  try {
    localStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // ignorado
  }
}

/**
 * Reutiliza a chave quando o conteúdo é o mesmo (clique repetido, reenvio após timeout)
 * e gera uma nova quando o pedido mudou.
 */
export function attemptFor(payload: CreateOrderPayload): CheckoutAttempt {
  const { walletSessionId: _session, ...content } = payload
  const payloadHash = stableStringify(content)
  const current = loadAttempt()
  if (current && current.payloadHash === payloadHash) return current
  const attempt = { idempotencyKey: crypto.randomUUID(), payloadHash }
  saveAttempt(attempt)
  return attempt
}
