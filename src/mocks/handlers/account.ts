import { http, HttpResponse, delay } from 'msw'
import type { AccountProfile, PasswordChange, Wallet, WalletInput, WalletSlot } from '@/types'
import { hashPassword, publicUser, readUsers, updateUser } from '@/mocks/auth'
import { MOCK_NFTS } from '@/mocks/fixtures/nfts'
import { passwordRuleError, validateProfile, validateWallet, type ProfileForm } from '@/lib/account'
import { requireUser } from './auth'

const BASE = '/api'

const error = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ error: message, code, ...extra }, { status })

const randomSalt = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')

export const accountHandlers = [
  // ─── Perfil ──────────────────────────────────────────────────────────────

  http.get(`${BASE}/profile`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(150)
    const profile: AccountProfile = { ...user.profile, avatar: user.avatar }
    return HttpResponse.json(profile)
  }),

  // PATCH /api/profile — dados do perfil (conflito de e-mail/usuário → 409)
  http.patch(`${BASE}/profile`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(400)
    const body = (await request.json()) as ProfileForm
    const input: ProfileForm = {
      displayName: body.displayName?.trim() ?? '',
      username: body.username?.trim().toLowerCase() ?? '',
      profileName: body.profileName?.trim() ?? '',
      email: body.email?.trim().toLowerCase() ?? '',
      ensName: body.ensName?.trim().toLowerCase() ?? '',
    }
    const fieldErrors = validateProfile(input)
    if (Object.keys(fieldErrors).length) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', { fieldErrors })

    const others = Object.values(await readUsers()).filter((u) => u.id !== user.id)
    if (others.some((u) => u.email === input.email)) {
      return error(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { fieldErrors: { email: 'Este e-mail já está em uso por outra conta.' } })
    }
    if (others.some((u) => u.username === input.username)) {
      return error(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fieldErrors: { username: 'Este nome de usuário já está em uso.' } })
    }
    const updated = await updateUser(user.id, (u) => {
      u.profile = input
      u.displayName = input.displayName
      u.username = input.username
      u.email = input.email
    })
    return HttpResponse.json({ profile: { ...input, avatar: updated!.avatar }, user: publicUser(updated!) })
  }),

  // PUT /api/profile/avatar — imagem já redimensionada (data URL)
  http.put(`${BASE}/profile/avatar`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(500)
    const { image } = (await request.json()) as { image?: string }
    if (!image || !/^data:image\/(png|jpeg|webp);base64,/.test(image)) {
      return error(422, 'INVALID_IMAGE', 'Envie uma imagem PNG, JPG ou WebP.')
    }
    if (image.length > 400_000) return error(413, 'IMAGE_TOO_LARGE', 'A imagem é muito grande.')
    const updated = await updateUser(user.id, (u) => {
      u.avatar = image
    })
    return HttpResponse.json(publicUser(updated!))
  }),

  http.delete(`${BASE}/profile/avatar`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(300)
    const updated = await updateUser(user.id, (u) => {
      delete u.avatar
    })
    return HttpResponse.json(publicUser(updated!))
  }),

  // POST /api/profile/password — confere a senha atual; grava só o hash
  http.post(`${BASE}/profile/password`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(500)
    const { currentPassword, newPassword } = (await request.json()) as Partial<PasswordChange>
    if (!currentPassword || (await hashPassword(currentPassword, user.salt)) !== user.passwordHash) {
      return error(422, 'CURRENT_PASSWORD_INVALID', 'Senha atual incorreta.', { fieldErrors: { currentPassword: 'Senha atual incorreta.' } })
    }
    const rule = passwordRuleError(newPassword ?? '')
    if (rule) return error(422, 'VALIDATION_ERROR', rule, { fieldErrors: { newPassword: rule } })
    const salt = randomSalt()
    const passwordHash = await hashPassword(newPassword!, salt)
    await updateUser(user.id, (u) => {
      u.salt = salt
      u.passwordHash = passwordHash
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // ─── Carteiras ───────────────────────────────────────────────────────────

  http.get(`${BASE}/wallets`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(150)
    return HttpResponse.json(user.wallets)
  }),

  // PUT /api/wallets/:slot — cadastra ou edita a carteira principal/secundária
  http.put(`${BASE}/wallets/:slot`, async ({ request, params }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(400)
    const slot = params.slot as WalletSlot
    if (slot !== 'primary' && slot !== 'secondary') return error(404, 'NOT_FOUND', 'Carteira não encontrada.')
    const body = (await request.json()) as WalletInput & { sameAsPrimary?: boolean }
    const primary = user.wallets.find((w) => w.isPrimary)

    let wallet: Wallet
    if (slot === 'secondary' && body.sameAsPrimary) {
      if (!primary) return error(422, 'PRIMARY_REQUIRED', 'Cadastre a carteira principal primeiro.')
      wallet = { ...primary, id: 'wallet-secondary', label: `${primary.label} (secundária)`, isPrimary: false, sameAsPrimary: true }
    } else {
      const fieldErrors = validateWallet({
        ...body,
        ens: body.ens ?? '',
        referralCode: body.referralCode ?? '',
      })
      if (Object.keys(fieldErrors).length) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', { fieldErrors })
      const other = user.wallets.find((w) => w.isPrimary !== (slot === 'primary'))
      if (other && !other.sameAsPrimary && other.address.toLowerCase() === body.address.trim().toLowerCase()) {
        return error(409, 'WALLET_DUPLICATED', 'Este endereço já está cadastrado.', {
          fieldErrors: { address: 'Este endereço já é a outra carteira cadastrada. Use "Igual à carteira principal".' },
        })
      }
      const current = user.wallets.find((w) => w.isPrimary === (slot === 'primary'))
      wallet = {
        id: current?.id ?? `wallet-${randomSalt()}`,
        isPrimary: slot === 'primary',
        label: body.label.trim(),
        network: body.network,
        address: body.address.trim(),
        ens: body.ens?.trim() || undefined,
        connector: body.connector,
        ownerName: body.ownerName.trim(),
        profileName: body.profileName.trim(),
        email: body.email.trim().toLowerCase(),
        ensName: body.ensName.trim().toLowerCase(),
        referralCode: body.referralCode?.trim().toUpperCase() || undefined,
      }
    }

    const updated = await updateUser(user.id, (u) => {
      u.wallets = [...u.wallets.filter((w) => w.isPrimary !== (slot === 'primary')), wallet]
      // Secundária "igual à principal" acompanha as edições da principal
      if (slot === 'primary') {
        u.wallets = u.wallets.map((w) =>
          w.sameAsPrimary ? { ...wallet, id: w.id, label: `${wallet.label} (secundária)`, isPrimary: false, sameAsPrimary: true } : w,
        )
      }
    })
    return HttpResponse.json(updated!.wallets)
  }),

  http.delete(`${BASE}/wallets/secondary`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(300)
    const updated = await updateUser(user.id, (u) => {
      u.wallets = u.wallets.filter((w) => w.isPrimary)
    })
    return HttpResponse.json(updated!.wallets)
  }),

  // ─── Lista de interesse ──────────────────────────────────────────────────

  http.get(`${BASE}/favorites/nfts`, async ({ request }) => {
    const user = await requireUser(request)
    if (user instanceof Response) return user
    await delay(250)
    return HttpResponse.json(user.favorites.flatMap((id) => MOCK_NFTS.filter((n) => n.id === id)))
  }),
]
