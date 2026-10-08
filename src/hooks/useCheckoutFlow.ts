import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import type { Quote, Wallet, WalletSession } from '@/types'
import { cartKeys } from '@/hooks/useCart'
import { useConnectWallet, useCreateOrder, useDisconnectWallet, useOrder } from '@/hooks/useCheckout'
import { getErrorMessage, getErrorStatus } from '@/lib/apiError'
import {
  attemptFor,
  buildPayload,
  clearAttempt,
  loadAttempt,
  resolveWallet,
  saveAttempt,
  type CheckoutErrors,
  type CheckoutForm,
} from '@/lib/checkout'
import { getSocket } from '@/lib/realtime'

export type CheckoutPhase = 'idle' | 'review' | 'connecting' | 'submitting' | 'pending' | 'rejected' | 'failed'

export interface CheckoutFlowState {
  phase: CheckoutPhase
  /** Cotação revisada pelo colecionador (é ela que vai no pedido) */
  quote?: Quote
  /** Total anterior quando a API recusou por mudança de valores */
  previousTotal?: string
  message?: string
  orderId?: string
}

interface Options {
  form: CheckoutForm
  wallets: Wallet[]
  onValidationErrors: (errors: CheckoutErrors) => void
}

type ApiErrorBody = { code?: string; quote?: Quote; fieldErrors?: Record<string, string> }

export function useCheckoutFlow({ form, wallets, onValidationErrors }: Options) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const createOrder = useCreateOrder()
  const [session, setSession] = React.useState<WalletSession | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Pedido em andamento (inclusive após refresh) é retomado
  const [state, setState] = React.useState<CheckoutFlowState>(() => {
    const attempt = loadAttempt()
    return attempt?.orderId ? { phase: 'pending', orderId: attempt.orderId } : { phase: 'idle' }
  })
  React.useEffect(() => {
    if (state.phase === 'pending') setDialogOpen(true)
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const order = useOrder(state.phase === 'pending' || state.phase === 'rejected' ? state.orderId : undefined)

  // Estados terminais: confirmação só para pedido confirmado; recusa preserva o carrinho
  React.useEffect(() => {
    const data = order.data
    if (!data) return
    if (data.status === 'confirmed') {
      clearAttempt()
      queryClient.invalidateQueries({ queryKey: cartKeys.all })
      navigate({ to: '/pedido/$orderId', params: { orderId: data.id }, replace: true })
    } else if (data.status === 'rejected' && state.phase === 'pending') {
      clearAttempt()
      queryClient.invalidateQueries({ queryKey: cartKeys.all })
      setState((s) => ({ ...s, phase: 'rejected', message: data.failureReason }))
      setDialogOpen(true)
    }
  }, [order.data, navigate, queryClient, state.phase])

  // Pedido salvo que não existe mais (ex.: reset dos mocks)
  React.useEffect(() => {
    if (order.isError && [403, 404].includes(getErrorStatus(order.error) ?? 0)) {
      clearAttempt()
      setState({ phase: 'idle' })
      setDialogOpen(false)
    }
  }, [order.isError, order.error])

  // A carteira pode encerrar a sessão a qualquer momento
  React.useEffect(() => {
    let cleanup = () => {}
    let cancelled = false
    getSocket().then((socket) => {
      if (cancelled) return
      const onDisconnected = ({ sessionId }: { sessionId: string }) =>
        setSession((current) => (current?.id === sessionId ? null : current))
      socket.on('wallet.disconnected', onDisconnected)
      cleanup = () => socket.off('wallet.disconnected', onDisconnected)
    })
    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  const busy = state.phase === 'connecting' || state.phase === 'submitting'

  function startReview(quote: Quote) {
    setState({ phase: 'review', quote })
    setDialogOpen(true)
  }

  async function confirm() {
    const quote = state.quote
    if (!quote || busy) return
    const target = resolveWallet(form, wallets)
    let current = session
    // Conecta (ou reconecta, se a carteira/conector mudou)
    if (!current || current.address !== target.address || current.connector !== form.connector) {
      setState((s) => ({ ...s, phase: 'connecting', message: undefined }))
      try {
        current = await connect.mutateAsync({
          connector: form.connector as WalletSession['connector'],
          address: target.address,
          network: target.network as WalletSession['network'],
        })
        setSession(current)
      } catch (error) {
        setState((s) => ({ ...s, phase: 'failed', message: getErrorMessage(error, 'Não foi possível conectar a carteira.') }))
        return
      }
    }

    setState((s) => ({ ...s, phase: 'submitting', message: undefined }))
    const payload = buildPayload(form, wallets, quote, current.id)
    const attempt = attemptFor(payload)
    try {
      const created = await createOrder.mutateAsync({ payload, idempotencyKey: attempt.idempotencyKey })
      saveAttempt({ ...attempt, orderId: created.id })
      setState({ phase: 'pending', orderId: created.id })
    } catch (error) {
      const body = (isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined) ?? {}
      switch (body.code) {
        case 'QUOTE_CHANGED':
          // Valores mudaram: nova revisão obrigatória com a cotação atual
          if (body.quote) queryClient.setQueryData(cartKeys.quote, body.quote)
          queryClient.invalidateQueries({ queryKey: cartKeys.all })
          setState({ phase: 'review', quote: body.quote, previousTotal: quote.total, message: getErrorMessage(error) })
          return
        case 'WALLET_NOT_CONNECTED':
          setSession(null)
          setState((s) => ({ ...s, phase: 'review', message: getErrorMessage(error) }))
          return
        case 'VALIDATION_ERROR':
          setDialogOpen(false)
          setState({ phase: 'idle' })
          onValidationErrors((body.fieldErrors ?? {}) as CheckoutErrors)
          return
        case 'IDEMPOTENCY_CONFLICT':
          clearAttempt()
          setState((s) => ({ ...s, phase: 'failed', message: getErrorMessage(error) }))
          return
        default:
          setState((s) => ({
            ...s,
            phase: 'failed',
            message:
              'Não foi possível concluir o pedido agora. Tente novamente: a mesma tentativa não gera um pedido duplicado.',
          }))
      }
    }
  }

  function disconnectWallet() {
    if (!session) return
    disconnect.mutate(session.id)
    setSession(null)
  }

  /** Após recusa ou falha, volta para a revisão com a cotação atual */
  function retry(quote: Quote | undefined) {
    if (quote) setState({ phase: 'review', quote })
  }

  function closeDialog() {
    if (busy) return
    setDialogOpen(false)
    if (state.phase !== 'pending') setState({ phase: 'idle' })
  }

  return {
    state,
    order: order.data,
    session,
    busy,
    dialogOpen,
    setDialogOpen,
    startReview,
    confirm,
    retry,
    disconnectWallet,
    closeDialog,
  }
}
