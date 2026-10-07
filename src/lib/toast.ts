import React from 'react'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Aviso breve e acessível (anunciado por leitores de tela) */
export function toast(message: string, tone: Toast['tone'] = 'info') {
  const id = nextId++
  toasts = [...toasts, { id, message, tone }].slice(-3)
  emit()
  setTimeout(() => dismissToast(id), 5_000)
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts() {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => toasts,
    () => toasts,
  )
}
