import { test as base, expect, type Locator, type Page } from '@playwright/test'

/** Credenciais fictícias dos usuários semente (src/mocks/auth.ts) */
export const USERS = {
  nova: { email: 'nova@kurio.app', password: 'Kurio@123', name: 'Nova Sato' },
  leo: { email: 'leo@kurio.app', password: 'Kurio@456', name: 'Leo Martins' },
} as const
export type UserKey = keyof typeof USERS

/** NFT curado usado nos fluxos de compra: edição 1/50 com 3 unidades disponíveis */
export const EMERALD = {
  id: 'nft-001',
  name: 'Emerald Ape #042',
  price: '1.19',
  edition: 'nft-001-1-50',
  editionLabel: '1/50',
  available: 3,
}

// window.__kurioMock só existe no navegador (src/mocks/controls.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockControls = any

/** Ações de apoio que passam pela mesma camada de rede da aplicação (MSW) */
export class App {
  constructor(readonly page: Page) {}

  get isMobile() {
    return (this.page.viewportSize()?.width ?? 1440) < 768
  }

  /** Abre a rota e espera os mocks (MSW) estarem prontos */
  async goto(path: string) {
    await this.page.goto(path)
    await this.page.waitForFunction(() => !!(window as unknown as { __kurioMock?: unknown }).__kurioMock)
  }

  /** Executa uma função com os controles dos mocks (window.__kurioMock) */
  mock<R, A = undefined>(fn: (mock: MockControls, arg: A) => R | Promise<R>, arg?: A): Promise<R> {
    return this.page.evaluate(
      ([source, value]) => {
        const run = new Function(`return (${source})`)() as (m: unknown, a: unknown) => unknown
        return run((window as unknown as { __kurioMock: unknown }).__kurioMock, value)
      },
      [fn.toString(), arg] as const,
    ) as Promise<R>
  }

  /**
   * Espera o socket.io-client da página conectar ao servidor simulado
   * (autenticado: o servidor já associou a conexão ao usuário da sessão).
   */
  async waitForSocket({ authenticated = false } = {}) {
    await expect
      .poll(() =>
        this.mock((m: MockControls, auth: boolean) =>
          (m.getConnections() as { userId: string | null }[]).some((c) => !auth || c.userId !== null),
        authenticated),
      )
      .toBe(true)
  }

  /** Emite nft.updated pelo servidor Socket.IO simulado e devolve o evento */
  emitNftUpdate(nftId: string, patch: { price?: string; editions?: Record<string, number | null> }) {
    return this.mock((m: MockControls, a: { nftId: string; patch: unknown }) => m.emitNftUpdate(a.nftId, a.patch), { nftId, patch })
  }

  /** Requisição à API simulada com o token da sessão atual */
  api<T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    return this.page.evaluate(
      async ({ method, path, body }) => {
        // Antes do MSW iniciar, a requisição chegaria ao servidor de desenvolvimento
        while (!(window as unknown as { __kurioMock?: unknown }).__kurioMock) await new Promise((r) => setTimeout(r, 50))
        const token = localStorage.getItem('kurio:token')
        const res = await fetch(`/api${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        const text = await res.text()
        return { status: res.status, data: text ? JSON.parse(text) : null }
      },
      { method, path, body },
    ) as Promise<{ status: number; data: T }>
  }

  /** Entra pela API (atalho para testes que não validam o login em si) e recarrega */
  async loginByApi(user: UserKey, path = '/') {
    if (!this.page.url().startsWith('http')) await this.goto('/')
    const { email, password } = USERS[user]
    const { status, data } = await this.api<{ token: string; user: { id: string } }>('POST', '/auth/login', { email, password })
    expect(status).toBe(200)
    await this.page.evaluate(({ token, id }) => {
      localStorage.setItem('kurio:token', token)
      localStorage.setItem('kurio:last-user', id)
    }, { token: data.token, id: data.user.id })
    await this.goto(path)
  }

  async addToCartByApi(nftId = EMERALD.id, editionId = EMERALD.edition, quantity = 1) {
    const { status } = await this.api('POST', '/cart/items', { nftId, editionId, quantity })
    expect(status).toBe(201)
  }

  /** Cria um pedido pela API para o usuário da sessão (carrinho com 1 unidade do NFT padrão) */
  async createOrderByApi() {
    await this.addToCartByApi()
    const quote = await this.quote()
    const address = '0xA91F3c7D2b4E6f8A0c1B3d5E7f9A2c4E6b8DE82C'
    const session = await this.api<{ id: string }>('POST', '/wallet/connect', { connector: 'metamask', network: 'ethereum', address })
    const body = {
      walletSessionId: session.data.id,
      items: [{ itemId: `${EMERALD.id}:${EMERALD.edition}`, quantity: 1, unitPrice: EMERALD.price }],
      expectedTotal: quote.total,
      collector: { displayName: 'Nova Sato', username: 'nova.kurio', profileName: 'Nova', email: 'nova@kurio.app', ensName: 'nova.kurio', referralCode: '' },
      wallet: { network: 'ethereum', address, connector: 'metamask' },
    }
    const order = await this.page.evaluate(async (body) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
          Authorization: `Bearer ${localStorage.getItem('kurio:token')}`,
        },
        body: JSON.stringify(body),
      })
      return (await res.json()) as { id: string }
    }, body)
    return order.id
  }

  /** Pedidos gravados pelo mock (para verificar que não houve duplicação) */
  orderCount() {
    return this.page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kurio:mock:orders') ?? '{"orders":{}}') as { orders: object }
      return Object.keys(store.orders).length
    })
  }

  /** Abre o login pela navbar: modal no desktop, página no mobile */
  async openLogin() {
    await this.page.getByRole('banner').getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(this.authForm()).toBeVisible()
  }

  authForm(): Locator {
    return this.page.locator('form').filter({ has: this.page.getByLabel('Senha', { exact: true }) })
  }

  async fillLogin(user: UserKey | { email: string; password: string }) {
    const { email, password } = typeof user === 'string' ? USERS[user] : user
    const form = this.authForm()
    await form.getByLabel('E-mail', { exact: true }).fill(email)
    await form.getByLabel('Senha', { exact: true }).fill(password)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  }

  /** Menu da conta na navbar (presente quando há sessão) */
  accountButton(name: string = USERS.nova.name) {
    return this.page.getByRole('button', { name: `Conta de ${name}` })
  }

  async logout() {
    await this.accountButton().click()
    await this.page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(this.page.getByRole('banner').getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
  }

  /** Unidades no carrinho segundo a API (a navbar não aparece em todas as telas) */
  async cartUnits() {
    const { data } = await this.api<{ items: { quantity: number }[] }>('GET', '/cart')
    return data.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  /** Botão do carrinho na navbar (desktop) ou na barra inferior (mobile) */
  cartLink() {
    return this.page.getByRole('link', { name: /^Carrinho/ }).filter({ visible: true }).first()
  }

  /** Cotação atual da API (referência para conferir os valores exibidos) */
  async quote() {
    const { data } = await this.api<{ subtotal: string; discount: string; networkFee: string; total: string }>('GET', '/cart/quote')
    return data
  }
}

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await use(new App(page))
  },
})

export { expect }

/** Primeiro elemento visível (componentes com variantes desktop/mobile no DOM) */
export const visible = (locator: Locator) => locator.filter({ visible: true }).first()
