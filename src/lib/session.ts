import React from 'react'

/** Token da sessão (sobrevive a refresh) com notificação para quem depende dele */
const TOKEN_KEY = 'kurio:token'
const listeners = new Set<() => void>()

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // sem armazenamento: a sessão vale até fechar a aba
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // outra aba entrou/saiu
  const onStorage = (event: StorageEvent) => event.key === TOKEN_KEY && listener()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useToken() {
  return React.useSyncExternalStore(subscribe, getToken, () => null)
}

export const SESSION_EXPIRED_EVENT = 'kurio:session-expired'
