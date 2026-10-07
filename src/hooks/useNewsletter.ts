import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api } from '@/lib/api'

export function useNewsletterSignup() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<{ email: string }>('/newsletter', { email })
      return data
    },
  })
}

/** Erro de validação do e-mail (422) — os demais são informativos */
export function isValidationError(error: unknown) {
  return isAxiosError(error) && error.response?.status === 422
}

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (isAxiosError<{ error?: string }>(error)) return error.response?.data?.error ?? fallback
  return fallback
}
