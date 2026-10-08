import { test, expect, USERS, EMERALD, type App } from './support/fixtures'

/** Usuário da sessão atual segundo a API */
async function sessionUser(app: App) {
  const { status, data } = await app.api<{ user: { displayName: string; email: string } }>('GET', '/auth/session')
  return status === 200 ? data.user : null
}

test.describe('Cadastro', () => {
  test('valida os campos, trata conflito e cria a conta já autenticada', async ({ app, page }) => {
    await app.goto('/cadastro')
    const form = app.authForm()
    const submit = form.getByRole('button', { name: /^Criar (perfil|conta)$/ })

    // Validação no cliente: foco vai para o primeiro campo inválido
    await submit.click()
    await expect(form.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByLabel('Nome de usuário')).toBeFocused()

    await form.getByLabel('Nome de usuário').fill('colecionador.teste')
    await form.getByLabel('E-mail', { exact: true }).fill(USERS.nova.email)
    await form.getByLabel('Senha', { exact: true }).fill('senha1234')
    await form.getByLabel('Confirmar senha', { exact: true }).fill('outra1234')
    await submit.click()
    await expect(form.getByText('As senhas não conferem.')).toBeVisible()

    // Conflito retornado pela API (e-mail já cadastrado)
    await form.getByLabel('Confirmar senha', { exact: true }).fill('senha1234')
    await submit.click()
    await expect(form.getByText('Este e-mail já está cadastrado. Entre na sua conta.')).toBeVisible()
    await expect(form.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true')

    // Conflito de nome de usuário
    await form.getByLabel('Nome de usuário').fill('leo.mint')
    await form.getByLabel('E-mail', { exact: true }).fill('novo@kurio.app')
    await submit.click()
    await expect(form.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    // Sucesso
    await form.getByLabel('Nome de usuário').fill('colecionador.teste')
    await submit.click()
    await expect(page.getByRole('status').filter({ hasText: 'Conta criada com sucesso' })).toBeVisible()
    await expect.poll(async () => (await sessionUser(app))?.email).toBe('novo@kurio.app')

    // Sessão recuperada após refresh
    await page.reload()
    await expect.poll(async () => (await sessionUser(app))?.email).toBe('novo@kurio.app')
  })
})

test.describe('Login', () => {
  test('recusa credenciais inválidas e entra com as válidas', async ({ app, page }) => {
    await app.goto('/')
    if (app.isMobile) await app.goto('/login')
    else await app.openLogin()

    const form = app.authForm()
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(form.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true')

    await app.fillLogin({ email: USERS.nova.email, password: 'senha-errada1' })
    await expect(form.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

    await app.fillLogin('nova')
    await expect(page.getByRole('status').filter({ hasText: `Olá, ${USERS.nova.name}!` })).toBeVisible()
    if (!app.isMobile) await expect(app.accountButton()).toBeVisible()
    expect((await sessionUser(app))?.email).toBe(USERS.nova.email)
  })

  test('rota protegida leva ao login e retorna ao fluxo anterior', async ({ app, page }) => {
    await app.goto('/perfil/carteiras')
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await app.fillLogin('nova')
    await expect(page).toHaveURL(/\/perfil\/carteiras$/)
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })
})

test.describe('Sessão', () => {
  test('expiração durante a navegação pede login e retoma a tela', async ({ app, page }) => {
    await app.loginByApi('nova', '/perfil')
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue(USERS.nova.name)

    await app.mock((m) => m.expireSession())
    await page.reload()

    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await expect(page.getByRole('status').filter({ hasText: 'Sua sessão expirou' })).toBeVisible()
    await app.fillLogin('nova')
    await expect(page).toHaveURL(/\/perfil$/)
  })

  test('expiração pelo tempo de vida da sessão (relógio controlado)', async ({ app, page }) => {
    await page.clock.install()
    await app.loginByApi('nova', '/perfil')
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue(USERS.nova.name)

    // A sessão dura 1h: avança o relógio e a próxima requisição autenticada recebe 401
    await page.clock.fastForward('01:00:30')
    const { status, data } = await app.api<{ code: string }>('GET', '/auth/session')
    expect(status).toBe(401)
    expect(data.code).toBe('SESSION_EXPIRED')
  })

  test('expiração no checkout preserva o rascunho para a retomada', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    await app.goto('/pagamento')

    if (app.isMobile) await page.getByRole('button', { name: /Dados do colecionador/ }).click()
    const referral = page.getByRole('textbox', { name: /Código de indicação/ })
    await referral.fill('JUNGLE24')

    await app.mock((m) => m.expireSession())
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await app.fillLogin('nova')
    await expect(page).toHaveURL(/\/pagamento$/)
    if (app.isMobile) await page.getByRole('button', { name: /Dados do colecionador/ }).click()
    await expect(page.getByRole('textbox', { name: /Código de indicação/ })).toHaveValue('JUNGLE24')
    expect(await app.cartUnits()).toBe(1)
  })

  test('logout e troca de usuário não deixam dados da conta anterior', async ({ app, page }) => {
    await app.loginByApi('nova')
    await app.addToCartByApi()
    await app.api('PUT', `/favorites/${EMERALD.id}`)
    await app.goto('/')
    await expect(app.cartLink()).toHaveAccessibleName(/1 item/)

    // Logout
    if (app.isMobile) {
      await app.goto('/perfil')
      await page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).click()
      await expect(page).toHaveURL(/\/$/)
    } else {
      await app.logout()
    }
    await expect(app.cartLink()).toHaveAccessibleName(/vazio/)
    expect(await sessionUser(app)).toBeNull()

    // Outro usuário
    await app.goto('/login')
    await app.fillLogin('leo')
    await expect(page).toHaveURL(/\/$/)
    await expect(app.cartLink()).toHaveAccessibleName(/vazio/)
    if (!app.isMobile) await expect(app.accountButton(USERS.leo.name)).toBeVisible()

    await app.goto('/perfil/lista-de-interesse')
    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()
    await expect(
      page.getByRole('button', { name: `Remover ${EMERALD.name} dos favoritos` }),
    ).toHaveCount(0)
  })
})

test.describe('Isolamento entre usuários', () => {
  test('pedido de outra conta responde sem permissão e não expõe o recibo', async ({ app, page }) => {
    await app.loginByApi('nova')
    const orderId = await app.createOrderByApi()

    await app.loginByApi('leo', `/pedido/${orderId}`)
    await expect(page.getByRole('heading', { name: 'Você não tem acesso a este pedido' })).toBeVisible()
    await expect(page.getByText(EMERALD.name)).toHaveCount(0)

    const { status, data } = await app.api<{ code: string; items?: unknown }>('GET', `/orders/${orderId}`)
    expect(status).toBe(403)
    expect(data.code).toBe('FORBIDDEN')
    expect(data.items).toBeUndefined()
  })
})
