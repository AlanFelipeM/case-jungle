/*
 * Contas e sessões simuladas (persistidas para sobreviver a refresh).
 * Senhas nunca ficam em claro: guarda-se apenas o hash SHA-256 com salt.
 */
import type { CollectorProfile, User, Wallet } from '@/types'

const USERS_KEY = 'kurio:mock:users'
const SESSIONS_KEY = 'kurio:mock:sessions'
export const SESSION_TTL_MS = 60 * 60_000

export interface StoredUser extends User {
  passwordHash: string
  salt: string
  profile: CollectorProfile
  wallets: Wallet[]
  favorites: string[]
}

interface StoredSession {
  userId: string
  expiresAt: number
}

export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

// ─── Usuários de demonstração ──────────────────────────────────────────────

/** Credenciais fictícias documentadas: senhas Kurio@123 e Kurio@456 */
const SEED_USERS = [
  {
    id: 'usr-nova',
    username: 'nova.kurio',
    displayName: 'Nova Sato',
    email: 'nova@kurio.app',
    password: 'Kurio@123',
    wallets: [
      {
        id: 'wallet-reserva',
        label: 'Reserva',
        address: '0x5B7C2e1Fd04A6c3b9E8d2A7f61C0b3D4e9A1F2c7',
        ens: 'nova.kurio.eth',
        network: 'polygon',
        isPrimary: false,
        connector: 'coinbase',
      },
      {
        id: 'wallet-principal',
        label: 'Principal',
        address: '0xA91F3c7D2b4E6f8A0c1B3d5E7f9A2c4E6b8DE82C',
        network: 'ethereum',
        isPrimary: true,
        connector: 'metamask',
      },
    ] satisfies Wallet[],
  },
  {
    id: 'usr-leo',
    username: 'leo.mint',
    displayName: 'Leo Martins',
    email: 'leo@kurio.app',
    password: 'Kurio@456',
    wallets: [
      {
        id: 'wallet-leo',
        label: 'Principal',
        address: '0x3C8e7B21aF09d4E6c1B5a7D3f2E8c9A0b4D6F1e9',
        network: 'ethereum',
        isPrimary: true,
        connector: 'walletconnect',
      },
    ] satisfies Wallet[],
  },
]

async function seedUsers(): Promise<Record<string, StoredUser>> {
  const users: Record<string, StoredUser> = {}
  for (const seed of SEED_USERS) {
    const salt = randomHex(8)
    const { password, wallets, ...user } = seed
    users[user.id] = {
      ...user,
      createdAt: '2026-08-01T12:00:00.000Z',
      salt,
      passwordHash: await hashPassword(password, salt),
      profile: {
        displayName: user.displayName,
        username: user.username,
        profileName: user.displayName.split(' ')[0],
        email: user.email,
        ensName: user.username,
      },
      wallets,
      favorites: [],
    }
  }
  return users
}

// ─── Persistência ──────────────────────────────────────────────────────────

function read<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sem persistência: vale só nesta sessão
  }
}

export async function readUsers(): Promise<Record<string, StoredUser>> {
  const stored = read<Record<string, StoredUser>>(USERS_KEY)
  if (stored) return stored
  const seeded = await seedUsers()
  write(USERS_KEY, seeded)
  return seeded
}

export function writeUsers(users: Record<string, StoredUser>) {
  write(USERS_KEY, users)
}

export async function updateUser(userId: string, fn: (user: StoredUser) => void) {
  const users = await readUsers()
  const user = users[userId]
  if (!user) return undefined
  fn(user)
  writeUsers(users)
  return user
}

export function publicUser(user: StoredUser): User {
  const { id, username, displayName, email, avatar, createdAt } = user
  return { id, username, displayName, email, avatar, createdAt }
}

// ─── Sessões ───────────────────────────────────────────────────────────────

const readSessions = () => read<Record<string, StoredSession>>(SESSIONS_KEY) ?? {}

export function createSession(userId: string) {
  const sessions = readSessions()
  const token = randomHex(24)
  const expiresAt = Date.now() + SESSION_TTL_MS
  sessions[token] = { userId, expiresAt }
  write(SESSIONS_KEY, sessions)
  return { token, expiresAt: new Date(expiresAt).toISOString() }
}

export function deleteSession(token: string) {
  const sessions = readSessions()
  delete sessions[token]
  write(SESSIONS_KEY, sessions)
}

/** Expira todas as sessões ativas (cenário de sessão expirada) */
export function expireSessions() {
  const sessions = readSessions()
  for (const token of Object.keys(sessions)) sessions[token].expiresAt = 0
  write(SESSIONS_KEY, sessions)
}

export function resetAuth() {
  try {
    localStorage.removeItem(USERS_KEY)
    localStorage.removeItem(SESSIONS_KEY)
  } catch {
    // ignorado
  }
}

export type AuthResult =
  | { status: 'anonymous' }
  | { status: 'expired' }
  | { status: 'authenticated'; user: StoredUser; token: string }

export function tokenFrom(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/** Usuário da requisição a partir do token (Authorization: Bearer) */
export async function authenticate(token: string | null): Promise<AuthResult> {
  if (!token) return { status: 'anonymous' }
  const session = readSessions()[token]
  if (!session || session.expiresAt <= Date.now()) return { status: 'expired' }
  const user = (await readUsers())[session.userId]
  return user ? { status: 'authenticated', user, token } : { status: 'expired' }
}

export const authRequest = (request: Request) => authenticate(tokenFrom(request))
