import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorStatus } from '@/lib/apiError'

export { getErrorMessage } from '@/lib/apiError'

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
  return getErrorStatus(error) === 422
}
