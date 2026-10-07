import { http, HttpResponse, delay } from 'msw'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types'
import {
  authRequest,
  createSession,
  deleteSession,
  hashPassword,
  publicUser,
  readUsers,
  tokenFrom,
  updateUser,
  writeUsers,
  type StoredUser,
} from '@/mocks/auth'
import { MOCK_NFTS } from '@/mocks/fixtures/nfts'
import { mergeGuestCart } from './cart'
import { disconnectUserSockets } from './realtime'

const BASE = '/api'

const error = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ error: message, code, ...extra }, { status })

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME = /^[a-z0-9_.]{3,20}$/

/** Regras de senha (mesmas do formulário) */
export function passwordIssues(password: string) {
  const issues: string[] = []
  if (password.length < 8) issues.push('mínimo de 8 caracteres')
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) issues.push('letras e números')
  return issues
}

const randomSalt = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')

function session(user: StoredUser): AuthResponse {
  const { token, expiresAt } = createSession(user.id)
  // Itens adicionados como visitante continuam no carrinho da conta
  mergeGuestCart(user.id)
  return { user: publicUser(user), token, expiresAt }
}

/** Exige sessão válida; devolve o usuário ou a resposta de erro */
export async function requireUser(request: Request): Promise<StoredUser | Response> {
  const auth = await authRequest(request)
  if (auth.status === 'authenticated') return auth.user
  return auth.status === 'expired'
    ? error(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
    : error(401, 'UNAUTHORIZED', 'Entre na sua conta para continuar.')
}

export const authHandlers = [
  // POST /api/auth/login
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(500)
    const { email, password } = (await request.json()) as Partial<LoginPayload>
    const fieldErrors: Record<string, string> = {}
    if (!email || !EMAIL.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
    if (!password) fieldErrors.password = 'Informe a senha.'
    if (Object.keys(fieldErrors).length) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', { fieldErrors })

    const users = await readUsers()
    const user = Object.values(users).find((u) => u.email === email!.trim().toLowerCase())
    // Mesma resposta para e-mail inexistente e senha errada (não revela contas)
    if (!user || (await hashPassword(password!, user.salt)) !== user.passwordHash) {
      return error(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    return HttpResponse.json(session(user))
  }),

  // POST /api/auth/register
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    await delay(600)
    const body = (await request.json()) as Partial<RegisterPayload>
    const username = body.username?.trim().toLowerCase() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''
    const fieldErrors: Record<string, string> = {}
    if (!USERNAME.test(username)) fieldErrors.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.'
    if (!EMAIL.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
    const issues = passwordIssues(password)
    if (issues.length) fieldErrors.password = `A senha precisa ter ${issues.join(' e ')}.`
    if (Object.keys(fieldErrors).length) return error(422, 'VALIDATION_ERROR', 'Revise os campos.', { fieldErrors })

    const users = await readUsers()
    const all = Object.values(users)
    if (all.some((u) => u.email === email)) {
      return error(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { fieldErrors: { email: 'Este e-mail já está cadastrado. Entre na sua conta.' } })
    }
    if (all.some((u) => u.username === username)) {
      return error(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fieldErrors: { username: 'Este nome de usuário já está em uso.' } })
    }

    const salt = randomSalt()
    const user: StoredUser = {
      id: `usr-${randomSalt()}`,
      username,
      displayName: username,
      email,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: await hashPassword(password, salt),
      profile: { displayName: username, username, profileName: username, email, ensName: username.replace(/[_]/g, '-') },
      wallets: [],
      favorites: [],
    }
    users[user.id] = user
    writeUsers(users)
    return HttpResponse.json(session(user), { status: 201 })
  }),

  // GET /api/auth/session — recupera a sessão após refresh
  http.get(`${BASE}/auth/session`, async ({ request }) => {
    await delay(150)
    const user = await requireUser(request)
    if (user instanceof Response) return user
    return HttpResponse.json({ user: publicUser(user) })
  }),

  // POST /api/auth/logout
  http.post(`${BASE}/auth/logout`, async ({ request }) => {
    const token = tokenFrom(request)
    if (token) {
      deleteSession(token)
      disconnectUserSockets(token)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ─── Favoritos ───────────────────────────────────────────────────────────

  http.get(`${BASE}/favorites`, async ({ request }) => {
    await delay(150)
    const user = await requireUser(request)
    if (user instanceof Response) return user
    return HttpResponse.json(user.favorites)
  }),

  http.put(`${BASE}/favorites/:nftId`, async ({ request, params }) => {
    await delay(300)
    const user = await requireUser(request)
    if (user instanceof Response) return user
    const nftId = String(params.nftId)
    if (!MOCK_NFTS.some((n) => n.id === nftId)) return error(404, 'NOT_FOUND', 'NFT não encontrado.')
    const updated = await updateUser(user.id, (u) => {
      if (!u.favorites.includes(nftId)) u.favorites.push(nftId)
    })
    return HttpResponse.json(updated?.favorites ?? [])
  }),

  http.delete(`${BASE}/favorites/:nftId`, async ({ request, params }) => {
    await delay(300)
    const user = await requireUser(request)
    if (user instanceof Response) return user
    const updated = await updateUser(user.id, (u) => {
      u.favorites = u.favorites.filter((id) => id !== String(params.nftId))
    })
    return HttpResponse.json(updated?.favorites ?? [])
  }),
]
