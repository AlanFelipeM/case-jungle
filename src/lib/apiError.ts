import { isAxiosError } from 'axios'

/** Status HTTP de um erro do Axios (undefined para falhas de rede) */
export function getErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined
}

/** Mensagem retornada pela API ({ error }) ou um texto padrão */
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (isAxiosError<{ error?: string }>(error)) {
    if (!error.response) return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    return error.response.data?.error ?? fallback
  }
  return fallback
}
