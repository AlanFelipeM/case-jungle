import { test, expect, visible, EMERALD } from './support/fixtures'

const price = (page: import('@playwright/test').Page) =>
  visible(page.getByText(/^Preço: [\d.]+ ETH$/))

test.describe('Tempo real: ordem, duplicatas e reconexão', () => {
  test('ignora eventos duplicados ou antigos sem regredir o estado', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    await expect(price(page)).toHaveText(`Preço: ${EMERALD.price} ETH`)
    await app.waitForSocket()

    const first = await app.emitNftUpdate(EMERALD.id, { price: '1.35' })
    await expect(price(page)).toHaveText('Preço: 1.35 ETH')
    await app.emitNftUpdate(EMERALD.id, { price: '1.50' })
    await expect(price(page)).toHaveText('Preço: 1.50 ETH')

    // Evento antigo (versão menor) e duplicata do mais novo
    await app.mock((m, ev) => m.replayEvent(ev), first)
    await page.waitForTimeout(500)
    await expect(price(page)).toHaveText('Preço: 1.50 ETH')
  })

  test('reconcilia com a API REST ao reconectar após perder eventos', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    await expect(price(page)).toHaveText(`Preço: ${EMERALD.price} ETH`)
    await app.waitForSocket()

    // Derruba a conexão e altera o NFT enquanto o cliente está desconectado
    await app.mock((m, id) => {
      m.dropConnections()
      m.emitNftUpdate(id, { price: '2.20' })
    }, EMERALD.id)

    // O evento foi perdido; após reconectar, o cliente busca o estado atual na API
    await expect(price(page)).toHaveText('Preço: 2.20 ETH', { timeout: 15_000 })
  })

  test('pedido pendente é retomado após queda de conexão e refresh, sem nova compra', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    await app.mock((m) => m.setScenario({ paymentDelayMs: 6_000 }))
    await app.goto('/pagamento')

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.getByRole('dialog', { name: 'Revisar pedido' }).getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()
    await expect(page.getByRole('dialog', { name: 'Pagamento pendente' })).toBeVisible()

    // Conexão cai e a página é recarregada com o pedido ainda pendente
    await app.mock((m) => m.dropConnections())
    await page.reload()
    await expect(page.getByRole('dialog', { name: 'Pagamento pendente' })).toBeVisible()

    await expect(page).toHaveURL(/\/pedido\/ord-/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect(await app.orderCount()).toBe(1)
  })

  test('evento de pedido antigo não regride um pedido confirmado', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    await app.mock((m) => m.setScenario({ paymentDelayMs: 500 }))
    await app.goto('/pagamento')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.getByRole('dialog', { name: 'Revisar pedido' }).getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()
    await expect(page).toHaveURL(/\/pedido\/ord-/, { timeout: 15_000 })
    const orderId = page.url().split('/pedido/')[1]
    await app.waitForSocket({ authenticated: true })

    // Reenvia um "pending" antigo (versão 1) do mesmo pedido
    await app.mock((m, id) =>
      m.replayOrderEvent({ id: 'evento-antigo', resource: 'order', orderId: id, status: 'pending', version: 1, timestamp: new Date(0).toISOString() }),
    orderId)
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  })
})
