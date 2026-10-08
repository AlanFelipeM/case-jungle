import { test, expect, USERS } from './support/fixtures'

/** PNG 1×1 válido */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Perfil do colecionador', () => {
  test('edita os dados com validação, conflito da API e persistência', async ({ app, page }) => {
    await app.loginByApi('nova', '/perfil')
    const name = page.getByRole('textbox', { name: 'Nome de exibição' })
    const username = page.getByRole('textbox', { name: 'Nome de usuário' })
    const save = page.getByRole('button', { name: 'Salvar', exact: true })
    await expect(name).toHaveValue(USERS.nova.name)

    // Validação no cliente
    await name.fill('')
    await save.click()
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(name).toBeFocused()

    // Conflito retornado pela API
    await name.fill('Nova Kurio')
    await username.fill('leo.mint')
    await save.click()
    await expect(page.getByText('Este nome de usuário já está em uso.').first()).toBeVisible()
    await expect(username).toHaveAttribute('aria-invalid', 'true')

    // Sucesso
    await username.fill('nova.kurio')
    await save.click()
    await expect(page.getByRole('status').filter({ hasText: 'Perfil atualizado.' })).toBeVisible()
    if (!app.isMobile) await expect(app.accountButton('Nova Kurio')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Nova Kurio')
  })

  test('envia e remove o avatar, recusando arquivos inválidos', async ({ app, page }) => {
    await app.loginByApi('nova', '/perfil')
    const remove = page.getByRole('button', { name: 'Remover', exact: true })
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
    await expect(remove).toBeDisabled()

    await page.locator('#avatar-input').setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('texto') })
    await expect(page.locator('#avatar-error')).toBeVisible()

    await page.locator('#avatar-input').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Avatar atualizado.' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

    await remove.click()
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
  })

  test('altera a senha validando a senha atual e as regras', async ({ app, page }) => {
    await app.loginByApi('nova', '/perfil')
    const current = page.getByLabel('Senha atual', { exact: true })
    const next = page.getByLabel('Nova senha', { exact: true })
    const confirm = page.getByLabel('Confirmar nova senha', { exact: true })
    const save = page.getByRole('button', { name: 'Salvar', exact: true })

    await current.fill(USERS.nova.password)
    await next.fill('curta')
    await confirm.fill('curta')
    await save.click()
    await expect(next).toHaveAttribute('aria-invalid', 'true')

    await current.fill('SenhaErrada1')
    await next.fill('NovaSenha2026')
    await confirm.fill('NovaSenha2026')
    await save.click()
    await expect(page.getByText('Senha atual incorreta.').first()).toBeVisible()
    await expect(current).toHaveAttribute('aria-invalid', 'true')

    await current.fill(USERS.nova.password)
    await save.click()
    await expect(page.getByRole('status').filter({ hasText: 'Senha alterada.' })).toBeVisible()

    // A nova senha vale no login; a antiga não
    const old = await app.api('POST', '/auth/login', { email: USERS.nova.email, password: USERS.nova.password })
    expect(old.status).toBe(401)
    const fresh = await app.api('POST', '/auth/login', { email: USERS.nova.email, password: 'NovaSenha2026' })
    expect(fresh.status).toBe(200)
  })
})

test.describe('Carteiras', () => {
  test('edita a carteira principal com validação e persistência', async ({ app, page }) => {
    await app.loginByApi('nova', '/perfil/carteiras')
    const primary = page.getByRole('region', { name: 'Carteira principal' })
    const address = primary.getByRole('textbox', { name: 'Endereço da carteira' })
    const save = primary.getByRole('button', { name: 'Salvar carteira' })

    await address.fill('')
    await save.click()
    await expect(address).toHaveAttribute('aria-invalid', 'true')
    await expect(primary.getByText('Informe o endereço da carteira.')).toBeVisible()

    await address.fill('0x123')
    await save.click()
    await expect(primary.getByText('O endereço deve começar com 0x e ter 42 caracteres.')).toBeVisible()

    // Conflito: mesmo endereço da carteira secundária
    await address.fill('0x5B7C2e1Fd04A6c3b9E8d2A7f61C0b3D4e9A1F2c7')
    await save.click()
    await expect(primary.getByText(/já é a outra carteira cadastrada/)).toBeVisible()

    const newAddress = '0x1111222233334444555566667777888899990000'
    await address.fill(newAddress)
    await save.click()
    await expect(page.getByRole('status').filter({ hasText: 'Carteira principal salva.' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('region', { name: 'Carteira principal' }).getByRole('textbox', { name: 'Endereço da carteira' })).toHaveValue(newAddress)
  })

  test('cadastra a carteira secundária e usa a mesma da principal', async ({ app, page }) => {
    await app.loginByApi('leo', '/perfil/carteiras')
    const secondary = page.getByRole('region', { name: 'Carteira secundária' })

    await secondary.getByRole('button', { name: 'Adicionar' }).click()
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.getByRole('textbox', { name: 'Apelido da carteira' })).toHaveAttribute('aria-invalid', 'true')

    await secondary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Reserva')
    await secondary.getByRole('combobox', { name: 'Rede' }).selectOption('ethereum')
    await secondary.getByRole('combobox', { name: 'Tipo de carteira' }).selectOption('metamask')
    await secondary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x2222333344445555666677778888999900001111')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Carteira secundária salva.' })).toBeVisible()
    await expect(secondary.getByText('Reserva', { exact: true })).toBeVisible()

    await secondary.getByRole('checkbox', { name: 'Igual à carteira principal' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'igual à principal' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('region', { name: 'Carteira secundária' }).getByText(/Usando a mesma carteira da principal/)).toBeVisible()
  })
})
