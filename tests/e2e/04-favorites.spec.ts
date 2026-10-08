import { test, expect, EMERALD } from './support/fixtures'

const SAGE = 'Sage Nomad #009'

test.describe('Favoritos', () => {
  test('visitante é levado ao login ao favoritar', async ({ app, page }) => {
    await app.goto('/')
    await page.getByRole('button', { name: `Favoritar ${EMERALD.name} (requer login)` }).first().click()
    if (app.isMobile) await expect(page).toHaveURL(/\/login/)
    else await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeVisible()
  })

  test('favorito persiste para o usuário e aparece na lista de interesse', async ({ app, page }) => {
    await app.loginByApi('nova')
    await page.getByRole('button', { name: `Adicionar ${EMERALD.name} aos favoritos` }).first().click()

    const remove = page.getByRole('button', { name: `Remover ${EMERALD.name} dos favoritos` }).first()
    await expect(remove).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status').filter({ hasText: 'adicionado aos favoritos' })).toBeVisible()

    await page.reload()
    await expect(remove).toHaveAttribute('aria-pressed', 'true')

    await app.goto('/perfil/lista-de-interesse')
    await expect(page.getByRole('heading', { name: EMERALD.name })).toBeVisible()
  })

  test('falha na mutation desfaz a atualização otimista e permite tentar de novo', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.mock((m) => m.failNext('PUT', '/api/favorites', 503))

    await page.getByRole('button', { name: `Adicionar ${SAGE} aos favoritos` }).first().click()
    // Otimista: o coração muda na hora
    await expect(page.getByRole('button', { name: `Remover ${SAGE} dos favoritos` }).first()).toBeVisible()
    // A API falha: volta ao estado anterior e avisa
    await expect(page.getByRole('alert').filter({ hasText: 'A alteração foi desfeita' })).toBeVisible()
    const add = page.getByRole('button', { name: `Adicionar ${SAGE} aos favoritos` }).first()
    await expect(add).toHaveAttribute('aria-pressed', 'false')

    // Nova tentativa funciona e o servidor confirma
    await add.click()
    await expect(page.getByRole('button', { name: `Remover ${SAGE} dos favoritos` }).first()).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await app.api<string[]>('GET', '/favorites')).data).toContain('nft-002')
  })
})
