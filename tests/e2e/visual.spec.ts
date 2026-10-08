import { test, expect, EMERALD } from './support/fixtures'
import type { Page } from '@playwright/test'

/*
 * Regressão visual com dados estáveis: fixtures determinísticas, movimento reduzido
 * (carrossel parado, sem shimmer) e espera por fontes e imagens visíveis.
 * Baselines por projeto e sistema operacional em visual.spec.ts-snapshots/.
 */
test.use({ reducedMotion: 'reduce' })

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() =>
    [...document.images]
      .filter((img) => {
        const r = img.getBoundingClientRect()
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
      })
      .every((img) => img.complete && img.naturalWidth > 0),
  )
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
}

test.describe('Regressão visual', () => {
  test('início', async ({ app, page }) => {
    await app.goto('/')
    await expect(page.locator('ul[aria-busy]').getByRole('listitem')).toHaveCount(9)
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png')

    await page.getByRole('region', { name: 'Catálogo de NFTs' }).scrollIntoViewIfNeeded()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio-catalogo.png')
  })

  test('detalhe do NFT', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    await expect(page.getByRole('heading', { level: 1, name: EMERALD.name })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png')
  })

  test('carrinho', async ({ app, page }) => {
    await app.goto('/')
    await app.addToCartByApi(EMERALD.id, EMERALD.edition, 2)
    await app.goto('/carrinho')
    await expect(page.getByRole('group', { name: `Quantidade de ${EMERALD.name}` }).filter({ visible: true })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png')
  })

  test('pagamento', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi(EMERALD.id, EMERALD.edition, 2)
    await app.goto('/pagamento')
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png')
  })
})
