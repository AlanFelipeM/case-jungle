import { test, expect, EMERALD, type App } from './support/fixtures'
import type { Page } from '@playwright/test'

async function openReview(app: App, page: Page, scenario: Record<string, unknown> = {}) {
  await app.loginByApi('nova')
  await app.addToCartByApi()
  await app.mock((m, s) => m.setScenario(s), { paymentDelayMs: 1000, ...scenario })
  await app.goto('/pagamento')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revisar pedido' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Falhas de pagamento', () => {
  test('pagamento recusado preserva o carrinho e permite nova tentativa', async ({ app, page }) => {
    const dialog = await openReview(app, page, { payment: 'reject' })
    await dialog.getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()

    const rejected = page.getByRole('dialog', { name: 'Pagamento recusado' })
    await expect(rejected).toBeVisible({ timeout: 15_000 })
    await expect(rejected).toContainText('seus itens continuam no carrinho')
    await expect(page).toHaveURL(/\/pagamento$/)

    // Pedido terminal recusado; carrinho intacto
    expect(await app.orderCount()).toBe(1)
    expect(await app.cartUnits()).toBe(1)

    // Nova tentativa volta para a revisão
    await rejected.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('dialog', { name: 'Revisar pedido' })).toBeVisible()
  })

  test('carteira recusa a conexão sem criar pedido', async ({ app, page }) => {
    const dialog = await openReview(app, page, { walletConnection: 'reject' })
    await dialog.getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()
    const failed = page.getByRole('dialog', { name: 'Não foi possível concluir' })
    await expect(failed).toContainText('A conexão foi recusada na carteira.')
    expect(await app.orderCount()).toBe(0)
  })

  test('desconexão da carteira exige reconectar antes de pagar', async ({ app, page }) => {
    const dialog = await openReview(app, page, { paymentDelayMs: 60_000, payment: 'confirm' })
    // Conecta e deixa o pedido de lado: falha transitória no envio
    await app.mock((m) => m.failNext('POST', '/api/orders', 'network'))
    await app.mock((m) => m.failNext('POST', '/api/orders', 'network'))
    await app.mock((m) => m.failNext('POST', '/api/orders', 'network'))
    await dialog.getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()
    const failed = page.getByRole('dialog', { name: 'Não foi possível concluir' })
    await expect(failed).toContainText('a mesma tentativa não gera um pedido duplicado', { timeout: 15_000 })

    // A carteira encerra a sessão; a revisão volta a pedir conexão
    await failed.getByRole('button', { name: 'Tentar novamente' }).click()
    const review = page.getByRole('dialog', { name: 'Revisar pedido' })
    await expect(review.getByRole('button', { name: 'Confirmar e pagar' })).toBeVisible()
    await app.mock((m) => m.disconnectWallets())
    await expect(review.getByRole('button', { name: 'Conectar MetaMask e pagar' })).toBeVisible()
    expect(await app.orderCount()).toBe(0)
  })

  test('cliques repetidos geram um único pedido', async ({ app, page }) => {
    const dialog = await openReview(app, page)
    const pay = dialog.getByRole('button', { name: 'Conectar MetaMask e pagar' })
    await pay.click()
    // Cliques extras enquanto a carteira conecta não disparam outro envio
    await pay.click({ force: true, timeout: 1000 }).catch(() => undefined)
    await pay.click({ force: true, timeout: 1000 }).catch(() => undefined)

    await expect(page).toHaveURL(/\/pedido\/ord-/, { timeout: 15_000 })
    expect(await app.orderCount()).toBe(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido pela chave de idempotência', async ({ app, page }) => {
    test.setTimeout(90_000)
    // A API cria o pedido mas só responde depois do timeout do cliente (8s)
    const dialog = await openReview(app, page, { orderResponseDelayMs: 10_000 })
    const keys: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().endsWith('/api/orders')) keys.push(req.headers()['idempotency-key'])
    })

    await dialog.getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()
    await expect(page).toHaveURL(/\/pedido\/ord-/, { timeout: 40_000 })

    // Reenvio automático com a mesma chave, e um único pedido criado
    expect(keys.length).toBeGreaterThanOrEqual(2)
    expect(new Set(keys).size).toBe(1)
    expect(await app.orderCount()).toBe(1)
  })

  test('mesma chave com conteúdo diferente gera conflito', async ({ app }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    const quote = await app.quote()
    const connect = await app.api<{ id: string }>('POST', '/wallet/connect', {
      connector: 'metamask',
      network: 'ethereum',
      address: '0xA91F3c7D2b4E6f8A0c1B3d5E7f9A2c4E6b8DE82C',
    })
    const payload = (total: string) => ({
      walletSessionId: connect.data.id,
      items: [{ itemId: `${EMERALD.id}:${EMERALD.edition}`, quantity: 1, unitPrice: EMERALD.price }],
      expectedTotal: total,
      collector: { displayName: 'Nova Sato', username: 'nova.kurio', profileName: 'Nova', email: 'nova@kurio.app', ensName: 'nova.kurio' },
      wallet: { network: 'ethereum', address: '0xA91F3c7D2b4E6f8A0c1B3d5E7f9A2c4E6b8DE82C', connector: 'metamask' },
    })
    const send = (body: unknown) =>
      app.page.evaluate(async (body) => {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'chave-fixa-teste',
            Authorization: `Bearer ${localStorage.getItem('kurio:token')}`,
          },
          body: JSON.stringify(body),
        })
        return { status: res.status, body: await res.json() }
      }, body)

    const first = await send(payload(quote.total))
    expect(first.status).toBe(201)
    const repeat = await send(payload(quote.total))
    expect(repeat.status).toBe(200)
    expect(repeat.body.id).toBe(first.body.id)
    const conflict = await send(payload('9.99'))
    expect(conflict.status).toBe(409)
    expect(conflict.body.code).toBe('IDEMPOTENCY_CONFLICT')
  })
})
