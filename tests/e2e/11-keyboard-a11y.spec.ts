import { test, expect, EMERALD } from './support/fixtures'

test.describe('Teclado, foco e formulários', () => {
  test('diálogo de busca: abre pelo teclado, prende o foco e devolve ao fechar', async ({ app, page }) => {
    test.skip(app.isMobile, 'Busca da navbar (desktop)')
    await app.goto('/')
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Termo de busca')).toBeFocused()

    // Tab circula dentro do diálogo
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    // Busca completa só com teclado
    await page.keyboard.press('Enter')
    await page.keyboard.type('Emerald')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=Emerald/)
  })

  test('login pelo teclado: foco no primeiro erro e mensagens associadas aos campos', async ({ app, page }) => {
    test.skip(app.isMobile, 'Modal de login (desktop)')
    await app.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Entrar', exact: true }).focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog).toBeVisible()

    const email = dialog.getByLabel('E-mail', { exact: true })
    await email.focus()
    await page.keyboard.press('Enter')
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription('Informe o e-mail.')

    await page.keyboard.type('nova@kurio.app')
    await page.keyboard.press('Tab')
    await page.keyboard.type('Kurio@123')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(app.accountButton()).toBeVisible()
  })

  test('controles do detalhe operáveis pelo teclado', async ({ app, page }) => {
    await app.goto(`/nft/${EMERALD.id}`)
    const radio = page.getByRole('radio', { name: /^Aberta/ }).filter({ visible: true }).first()
    await radio.focus()
    await page.keyboard.press('Space')
    await expect(radio).toBeChecked()

    const increase = page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true }).first()
    await increase.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('group', { name: 'Quantidade' }).filter({ visible: true }).locator('output')).toHaveText('3')
  })

  test('pagamento: validação foca o primeiro campo inválido e anuncia o erro', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    await app.goto('/pagamento')
    if (app.isMobile) await page.getByRole('button', { name: /Dados do colecionador/ }).click()

    const email = page.getByRole('textbox', { name: 'E-mail', exact: true })
    await email.fill('email-invalido')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'Revise os campos destacados para continuar.' })).toBeVisible()
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('sem overflow horizontal nas telas principais', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    for (const path of ['/', `/nft/${EMERALD.id}`, '/carrinho', '/pagamento', '/perfil', '/perfil/carteiras']) {
      await app.goto(path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `overflow horizontal em ${path}`).toBeLessThanOrEqual(0)
    }
  })

  test('tablet (768px) e zoom de 400% (320px) sem overflow nem conteúdo cortado', async ({ app, page }) => {
    test.skip(app.isMobile, 'Os viewports são definidos no próprio teste')
    await app.loginByApi('nova')
    await app.addToCartByApi()
    for (const viewport of [{ width: 768, height: 1024 }, { width: 320, height: 720 }]) {
      await page.setViewportSize(viewport)
      for (const path of ['/', `/nft/${EMERALD.id}`, '/carrinho', '/pagamento', '/perfil', '/perfil/carteiras']) {
        await app.goto(path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `overflow horizontal em ${path} (${viewport.width}px)`).toBeLessThanOrEqual(0)
      }
    }
  })
})
