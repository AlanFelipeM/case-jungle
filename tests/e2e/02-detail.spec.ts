import { test, expect, visible, EMERALD } from './support/fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto carrega o NFT com edições e limite de quantidade', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    await expect(page.getByRole('heading', { level: 1, name: EMERALD.name })).toBeVisible()
    await expect(page).toHaveTitle(`${EMERALD.name} — Kurio`)

    // Edição esgotada não pode ser escolhida
    await expect(visible(page.getByRole('radio', { name: /^1\/10/ }))).toBeDisabled()
    await expect(visible(page.getByRole('radio', { name: /^1\/50/ }))).toBeChecked()

    // Quantidade limitada à disponibilidade da edição (3)
    const increase = visible(page.getByRole('button', { name: 'Aumentar quantidade' }))
    await increase.click()
    await increase.click()
    await expect(increase).toBeDisabled()
    await expect(visible(page.getByRole('group', { name: 'Quantidade' })).locator('output')).toHaveText(String(EMERALD.available))
  })

  test('navegação do catálogo para o detalhe', async ({ app, page }) => {
    await app.goto('/')
    await page.getByRole('link', { name: EMERALD.name }).first().click()
    await expect(page).toHaveURL(new RegExp(`/nft/${EMERALD.id}$`))
    await expect(page.getByRole('heading', { level: 1, name: EMERALD.name })).toBeVisible()
  })

  test('NFT inexistente mostra o estado de não encontrado', async ({ app, page }) => {
    await app.goto('/nft/nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'NFT não encontrado' })).toBeVisible()
  })

  test('rota inexistente mostra a página 404', async ({ app, page }) => {
    await app.goto('/rota/que-nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
  })

  test('edição que esgota durante a compra é recusada pela API', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    await expect(page.getByRole('heading', { level: 1, name: EMERALD.name })).toBeVisible()
    // Outra compra esgota a edição sem que a página saiba (sem evento)
    await app.addToCartByApi(EMERALD.id, EMERALD.edition, EMERALD.available)

    await visible(page.getByRole('button', { name: /^Comprar/ })).click()
    await expect(visible(page.getByRole('alert').filter({ hasText: 'quantidade máxima desta edição' }))).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/nft/${EMERALD.id}$`))
  })
})
