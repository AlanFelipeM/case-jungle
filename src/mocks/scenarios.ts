/*
 * Cenários de checkout configuráveis e reproduzíveis (persistidos para sobreviver a refresh).
 * Ex.: __kurioMock.setScenario({ payment: 'reject' })
 */
export interface CheckoutScenario {
  /** Resposta da carteira ao pedido de conexão */
  walletConnection: 'approve' | 'reject'
  /** Resultado do pagamento na rede */
  payment: 'confirm' | 'reject'
  /** Atraso da resposta de criação do pedido (> 8s provoca timeout no cliente) */
  orderResponseDelayMs: number
  /** Tempo até a rede confirmar/recusar o pagamento */
  paymentDelayMs: number
}

const STORAGE_KEY = 'kurio:mock:scenario'

export const DEFAULT_SCENARIO: CheckoutScenario = {
  walletConnection: 'approve',
  payment: 'confirm',
  orderResponseDelayMs: 400,
  paymentDelayMs: 3_000,
}

export function getScenario(): CheckoutScenario {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_SCENARIO, ...(JSON.parse(stored) as Partial<CheckoutScenario>) }
  } catch {
    // sem armazenamento: cenário padrão
  }
  return DEFAULT_SCENARIO
}

export function setScenario(patch: Partial<CheckoutScenario>) {
  const next = { ...getScenario(), ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignorado
  }
  return next
}

export function resetScenario() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorado
  }
  return DEFAULT_SCENARIO
}
