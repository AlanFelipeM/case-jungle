import { test, expect, type App } from './support/fixtures'
import type { Page } from '@playwright/test'

type ListResponse = { total: number; totalPages: number; data: { name: string }[] }

/** Consulta a mesma API que a tela usa, com os mesmos parâmetros (referência das asserções) */
async function apiList(app: App, params: Record<string, string>) {
  const query = new URLSearchParams({ limit: '9', ...params }).toString()
  return (await app.api<ListResponse>('GET', `/nfts?${query}`)).data
}

const catalog = (page: Page) => page.getByRole('region', { name: 'Catálogo de NFTs' })
const results = (page: Page) => catalog(page).locator('ul[aria-busy]')
const firstCard = (page: Page) => results(page).getByRole('listitem').first().getByRole('heading')
const resultCount = (page: Page) => catalog(page).getByRole('status').filter({ hasText: 'NFTs encontrados' })

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação e paginação compõem a URL e voltam pelo histórico', async ({ app, page }) => {
    test.skip(app.isMobile, 'Fluxo com a barra lateral de filtros (desktop); o mobile tem teste próprio')
    await app.goto('/')
    const filters = page.getByRole('complementary', { name: 'Filtros do catálogo' })

    // Filtros combinados
    await filters.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/category=musica/)
    await filters.getByRole('button', { name: /^Polygon/ }).click()
    await expect(page).toHaveURL(/network=polygon/)
    await expect(filters.getByRole('button', { name: /^Música/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(filters.getByRole('button', { name: /^Polygon/ })).toHaveAttribute('aria-pressed', 'true')

    const combined = await apiList(app, { category: 'musica', network: 'polygon' })
    expect(combined.totalPages).toBeGreaterThan(1)
    await expect(resultCount(page)).toHaveText(`${combined.total} NFTs encontrados`)

    // Ordenação
    await page.getByRole('combobox', { name: 'Ordenar por' }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    const sorted = await apiList(app, { category: 'musica', network: 'polygon', sort: 'price-asc' })
    await expect(firstCard(page)).toContainText(sorted.data[0].name)

    // Paginação
    const pagination = page.getByRole('navigation', { name: 'Paginação' })
    await pagination.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    const page2 = await apiList(app, { category: 'musica', network: 'polygon', sort: 'price-asc', page: '2' })
    await expect(firstCard(page)).toContainText(page2.data[0].name)

    // Mudança de filtro reinicia a paginação
    await filters.getByRole('button', { name: /^Polygon/ }).click()
    await expect(page).not.toHaveURL(/page=/)
    await expect(page).not.toHaveURL(/network=/)

    // Histórico restaura a página 2 com os mesmos filtros
    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(page).toHaveURL(/network=polygon/)
    await expect(firstCard(page)).toContainText(page2.data[0].name)

    // Refresh mantém o estado
    await page.reload()
    await expect(firstCard(page)).toContainText(page2.data[0].name)
    await expect(filters.getByRole('button', { name: /^Polygon/ })).toHaveAttribute('aria-pressed', 'true')

    // Busca pela navbar preserva os filtros e reinicia a página
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('dialog').getByLabel('Termo de busca').fill('Nomad')
    await page.getByRole('dialog').getByRole('button', { name: 'Buscar' }).click()
    await expect(page).toHaveURL(/q=Nomad/)
    await expect(page).not.toHaveURL(/page=/)
    const searched = await apiList(app, { search: 'Nomad', category: 'musica', network: 'polygon', sort: 'price-asc' })
    await expect(resultCount(page)).toHaveText(`${searched.total} NFTs encontrados`)
  })

  test('resultado vazio oferece limpar os filtros', async ({ app, page }) => {
    await app.goto('/?q=zzzz&category=musica')
    await expect(catalog(page).getByText('Nenhum NFT encontrado')).toBeVisible()
    await catalog(page).getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page).not.toHaveURL(/q=|category=/)
    await expect(results(page).getByRole('listitem')).toHaveCount(9)
  })

  test('mobile: busca e filtros pela gaveta, com restauração pelo histórico', async ({ app, page }) => {
    test.skip(!app.isMobile, 'Variante mobile')
    await app.goto('/')

    await page.getByRole('searchbox', { name: 'Explorar coleções' }).fill('Ape')
    await page.getByRole('searchbox', { name: 'Explorar coleções' }).press('Enter')
    await expect(page).toHaveURL(/q=Ape/)

    await page.getByRole('button', { name: 'Filtros e ordenação' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await sheet.getByRole('button', { name: /^Arte digital/ }).click()
    await expect(page).toHaveURL(/category=arte-digital/)
    // O rádio é visualmente oculto; o rótulo é o alvo do toque
    await sheet.locator('label').filter({ hasText: 'Maior preço' }).click()
    await expect(sheet.getByRole('radio', { name: 'Maior preço' })).toBeChecked()
    await expect(page).toHaveURL(/sort=price-desc/)
    await page.keyboard.press('Escape')

    const expected = await apiList(app, { search: 'Ape', category: 'arte-digital', sort: 'price-desc' })
    await expect(firstCard(page)).toContainText(expected.data[0].name)
    await expect(page.getByRole('button', { name: 'Filtros e ordenação, 2 ativos' })).toBeVisible()

    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await expect(page).toHaveURL(/category=arte-digital/)
  })
})
