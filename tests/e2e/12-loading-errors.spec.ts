import { test, expect, EMERALD, type App } from './support/fixtures'

/** Aplica um cenário antes de carregar a página (persistido no localStorage dos mocks) */
async function withScenario(app: App, scenario: Record<string, unknown>, path: string) {
  await app.goto('/')
  await app.mock((m, s) => m.setScenario(s), scenario)
  await app.goto(path)
}

test.describe('Carregamento lento, falhas e recuperação', () => {
  test('skeletons no catálogo e no detalhe durante carregamento lento', async ({ app, page }) => {
    await withScenario(app, { networkLatencyMs: 1500 }, '/')
    const catalogSkeleton = page.getByRole('status', { name: 'Carregando NFTs...' })
    await expect(catalogSkeleton).toBeVisible()
    await expect(catalogSkeleton).toBeHidden({ timeout: 15_000 })
    await expect(page.locator('ul[aria-busy]').getByRole('listitem')).toHaveCount(9)

    await page.goto(`/nft/${EMERALD.id}`)
    const detailSkeleton = page.getByRole('status', { name: 'Carregando NFT...' })
    await expect(detailSkeleton).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: EMERALD.name })).toBeVisible({ timeout: 15_000 })
  })

  test('skeleton do carrinho e do resumo com latência variável', async ({ app, page }) => {
    await app.goto('/')
    await app.addToCartByApi()
    await withScenario(app, { networkLatencyMs: 1200, latencyJitterMs: 600 }, '/carrinho')
    await expect(page.locator('.skeleton').first()).toBeVisible()
    await expect(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` }).filter({ visible: true })).toBeVisible({ timeout: 15_000 })
  })

  test('falha HTTP no catálogo mostra erro e recupera ao tentar novamente', async ({ app, page }) => {
    await app.goto('/')
    // A consulta tenta 3 vezes (retry: 2) antes de exibir o erro
    await app.mock((m) => {
      m.failNext('GET', '/api/nfts', 500)
      m.failNext('GET', '/api/nfts', 502)
      m.failNext('GET', '/api/nfts', 503)
    })
    await page.getByRole('button', { name: 'Em alta' }).click()

    const error = page.getByRole('alert').filter({ hasText: 'Erro ao carregar NFTs' })
    await expect(error).toBeVisible({ timeout: 20_000 })
    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('ul[aria-busy]').getByRole('listitem').first()).toBeVisible()
    await expect(error).toBeHidden()
  })

  test('falha de conexão no carrinho e recuperação', async ({ app, page }) => {
    await app.goto('/')
    await app.mock((m) => {
      for (let i = 0; i < 3; i++) m.failNext('GET', '/api/cart', 'network')
    })
    await page.goto('/carrinho')

    const error = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o carrinho.' })
    await expect(error).toBeVisible({ timeout: 20_000 })
    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('detalhe com falha transitória mostra erro e recupera', async ({ app, page }) => {
    await app.goto('/')
    await app.mock((m, id) => {
      for (let i = 0; i < 3; i++) m.failNext('GET', `/api/nfts/${id}`, 503)
    }, EMERALD.id)
    await page.getByRole('link', { name: EMERALD.name }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Não foi possível carregar o NFT' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1, name: EMERALD.name })).toBeVisible()
  })
})
