import { test, expect, visible, EMERALD } from './support/fixtures'

/*
 * Os eventos saem do servidor Socket.IO simulado (MSW + @mswjs/socket.io-binding)
 * e chegam pelo socket.io-client da aplicação: nada é injetado direto no cache.
 */
test.describe('Tempo real no checkout', () => {
  test('preço alterado com o carrinho aberto atualiza o resumo e exige confirmação', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    await app.goto('/carrinho')
    const checkout = visible(page.getByRole('button', { name: 'Conectar e finalizar' }))
    await expect(checkout).toBeEnabled()

    await app.waitForSocket()
    await app.emitNftUpdate(EMERALD.id, { price: '1.35' })

    const notice = page.getByRole('alert').filter({ hasText: 'Seu carrinho foi atualizado' })
    await expect(notice).toContainText(`preço alterado de ${EMERALD.price} ETH para 1.35 ETH`)
    await expect(checkout).toBeDisabled()
    const quote = await app.quote()
    expect(quote.subtotal).toBe('1.35')
    await expect(visible(page.getByRole('complementary', { name: /Resumo/ }))).toContainText(`${quote.total} ETH`)

    await notice.getByRole('button', { name: 'Confirmar novos preços' }).click()
    await expect(notice).toBeHidden()
    await expect(checkout).toBeEnabled()
  })

  test('edição esgotada durante a navegação bloqueia o checkout', async ({ app, page }) => {
    await app.goto('/')
    await app.addToCartByApi(EMERALD.id, EMERALD.edition, 2)
    await app.goto('/carrinho')
    // Emite só depois de o carrinho carregar (evento e resposta REST não concorrem)
    await expect(visible(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` })).locator('output')).toHaveText('2')

    await app.waitForSocket()
    await app.emitNftUpdate(EMERALD.id, { editions: { '1/50': 1 } })
    const notice = page.getByRole('alert').filter({ hasText: 'Seu carrinho foi atualizado' })
    await expect(notice).toContainText('restam 1 unidade')
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeDisabled()

    // Atalho para ajustar à disponibilidade
    await visible(page.getByRole('button', { name: 'Ajustar para 1' })).click()
    await expect(notice).toBeHidden()
    await expect(visible(page.getByRole('button', { name: 'Conectar e finalizar' }))).toBeEnabled()
  })

  test('checkout recusa a cotação desatualizada e pede nova confirmação', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    await app.goto('/pagamento')
    const before = await app.quote()

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const review = page.getByRole('dialog', { name: 'Revisar pedido' })
    await expect(review).toContainText(`${before.total} ETH`)

    // O preço muda enquanto a revisão está aberta
    await app.waitForSocket()
    await app.emitNftUpdate(EMERALD.id, { price: '1.35' })
    await review.getByRole('button', { name: 'Conectar MetaMask e pagar' }).click()

    const warning = review.getByRole('alert')
    await expect(warning).toContainText('Os valores do pedido mudaram. Revise e confirme novamente.')
    await expect(warning).toContainText(`Total anterior: ${before.total} ETH`)
    const after = await app.quote()
    await expect(warning).toContainText(`total atual: ${after.total} ETH`)
    expect(await app.orderCount()).toBe(0)
  })
})
