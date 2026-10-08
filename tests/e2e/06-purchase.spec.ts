import { test, expect, visible, EMERALD } from './support/fixtures'

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado', async ({ app, page }) => {
    await app.goto('/')
    await app.mock((m) => m.setScenario({ paymentDelayMs: 1500 }))

    // Catálogo → detalhe
    await page.getByRole('link', { name: EMERALD.name }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: EMERALD.name })).toBeVisible()

    // Detalhe → carrinho (2 unidades)
    await visible(page.getByRole('button', { name: 'Aumentar quantidade' })).click()
    await visible(page.getByRole('button', { name: /^Comprar/ })).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(visible(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` })).locator('output')).toHaveText('2')

    // Carrinho → login → pagamento
    await visible(page.getByRole('button', { name: 'Conectar e finalizar' })).click()
    await app.fillLogin('nova')
    await expect(page).toHaveURL(/\/pagamento$/)

    // Revisão com os valores da cotação
    const quote = await app.quote()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const dialog = page.getByRole('dialog', { name: 'Revisar pedido' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(`${EMERALD.name} (${EMERALD.editionLabel}) · 2 × ${EMERALD.price} ETH`)
    await expect(dialog).toContainText(`${quote.total} ETH`)

    // Conexão da carteira + envio do pedido
    await dialog.getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()
    await expect(page.getByRole('dialog', { name: 'Pagamento pendente' })).toBeVisible()

    // Confirmação somente após o pedido confirmado pela simulação
    await expect(page).toHaveURL(/\/pedido\/ord-/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    const receipt = page.getByRole('region', { name: 'Detalhes da transação' })
    await expect(receipt).toContainText(EMERALD.name)
    await expect(page.getByText(`${quote.total} ETH`).first()).toBeVisible()

    // O recibo é o snapshot do pedido
    const orderId = page.url().split('/pedido/')[1]
    const { data: order } = await app.api<{ status: string; total: string; items: { quantity: number }[] }>('GET', `/orders/${orderId}`)
    expect(order.status).toBe('confirmed')
    expect(order.total).toBe(quote.total)
    expect(order.items[0].quantity).toBe(2)

    // Apenas os itens comprados saem do carrinho
    await expect.poll(() => app.cartUnits()).toBe(0)
    expect(await app.orderCount()).toBe(1)
  })
})
