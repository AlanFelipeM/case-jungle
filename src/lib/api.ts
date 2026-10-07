import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  // Requisições sem resposta em 8s são abortadas (o pedido é reenviado com a mesma chave)
  timeout: 8_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kurio:token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kurio:token')
      window.dispatchEvent(new CustomEvent('kurio:session-expired'))
    }
    return Promise.reject(error)
  },
)
