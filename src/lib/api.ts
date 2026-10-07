import axios from 'axios'
import { getToken, setToken, SESSION_EXPIRED_EVENT } from '@/lib/session'

export const api = axios.create({
  baseURL: '/api',
  // Requisições sem resposta em 8s são abortadas (o pedido é reenviado com a mesma chave)
  timeout: 8_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Envia o token da sessão
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 em requisição autenticada: a sessão expirou (credenciais inválidas no login não contam)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      setToken(null)
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)
