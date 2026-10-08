import { test, expect, visible, EMERALD, type App } from './support/fixtures'
import type { Page } from '@playwright/test'

/** Resumo visível (painel no desktop, rodapé fixo no mobile) */
const summary = (page: Page) =>
  visible(page.getByRole('complementary', { name: /Resumo/ }))

async function expectTotalsFromApi(app: App, page: Page) {
  const quote = await app.quote()
  await expect(summary(page).getByText('Total', { exact: true }).locator('xpath=..')).toContainText(`${quote.total} ETH`)
  return quote
}

test.describe('Carrinho', () => {
  test('adiciona pelo detalhe, altera quantidade, remove e mostra valores da API', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    await visible(page.getByRole('button', { name: /^Comprar/ })).click()
    await expect(page).toHaveURL(/\/carrinho$/)

    const quantity = visible(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` }))
    await expect(quantity.locator('output')).toHaveText('1')
    expect(await app.cartUnits()).toBe(1)

    await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(quantity.locator('output')).toHaveText('3')
    // Limite da edição (3 disponíveis)
    await expect(quantity.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await expect.poll(async () => (await app.quote()).subtotal).toBe('3.57')
    await expectTotalsFromApi(app, page)

    await quantity.getByRole('button', { name: 'Diminuir quantidade' }).click()
    await expect(quantity.locator('output')).toHaveText('2')
    await expect.poll(async () => (await app.quote()).subtotal).toBe('2.38')
    await expectTotalsFromApi(app, page)

    await visible(page.getByRole('button', { name: `Remover ${EMERALD.name} (edição ${EMERALD.editionLabel}) do carrinho` })).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    await expect.poll(() => app.cartUnits()).toBe(0)
  })

  test('cupom inválido, expirado, aplicado e removido', async ({ app, page }) => {
    await app.goto('/')
    await app.addToCartByApi()
    await app.goto('/carrinho')

    const code = visible(page.getByRole('textbox', { name: 'Código promocional' }))
    const apply = visible(page.getByRole('button', { name: 'Aplicar' }))

    await code.fill('XYZ')
    await apply.click()
    await expect(visible(page.getByRole('alert').filter({ hasText: 'Código promocional inválido.' }))).toBeVisible()
    await expect(code).toHaveAttribute('aria-invalid', 'true')

    await code.fill('LANCAMENTO')
    await apply.click()
    await expect(visible(page.getByRole('alert').filter({ hasText: 'Este código promocional expirou.' }))).toBeVisible()

    await code.fill('kurio10')
    await apply.click()
    await expect(visible(page.getByText(/Código KURIO10 aplicado/))).toBeVisible()
    const quote = await app.quote()
    expect(quote.discount).toBe('0.119')
    await expectTotalsFromApi(app, page)

    // Cupom persiste após refresh
    await page.reload()
    await expect(visible(page.getByText(/Código KURIO10 aplicado/))).toBeVisible()

    await visible(page.getByRole('button', { name: 'Remover código KURIO10' })).click()
    await expect(visible(page.getByRole('textbox', { name: 'Código promocional' }))).toBeVisible()
    expect((await app.quote()).discount).toBe('0.00')
  })

  test('carrinho do visitante persiste após refresh e é preservado ao entrar', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    await visible(page.getByRole('button', { name: /^Comprar/ })).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    const quantity = visible(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` }))
    await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(quantity.locator('output')).toHaveText('2')
    await expect.poll(() => app.cartUnits()).toBe(2)

    await page.reload()
    await expect(visible(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` })).locator('output')).toHaveText('2')

    // Finalizar exige login; os itens do visitante passam para a conta
    await visible(page.getByRole('button', { name: 'Conectar e finalizar' })).click()
    await app.fillLogin('nova')
    await expect(page).toHaveURL(/\/pagamento$/)
    await app.goto('/carrinho')
    await expect(visible(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` })).locator('output')).toHaveText('2')
    expect(await app.cartUnits()).toBe(2)
  })

  test('falha ao alterar quantidade desfaz a mudança', async ({ app, page }) => {
    await app.goto('/')
    await app.addToCartByApi()
    await app.goto('/carrinho')
    await app.mock((m) => m.failNext('PATCH', '/api/cart/items', 503))

    const quantity = visible(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` }))
    await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'A alteração foi desfeita' })).toBeVisible()
    await expect(quantity.locator('output')).toHaveText('1')
  })
})
