import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CameraOff, RotateCcw, ScanLine, X } from 'lucide-react'
import type QrScannerType from 'qr-scanner'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { parseNftQrCode } from '@/lib/nftQrCode'
import { cn } from '@/lib/utils'

type ScannerState =
  | { status: 'starting' }
  | { status: 'scanning' }
  | { status: 'invalid' }
  | { status: 'error'; message: string }

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  const text = String(error)
  if (!window.isSecureContext || !navigator.mediaDevices) {
    return 'A câmera só pode ser usada em uma conexão segura (HTTPS).'
  }
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Permita o acesso à câmera nas configurações do navegador para ler o QR code.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || /camera not found/i.test(text)) {
    return 'Nenhuma câmera foi encontrada neste dispositivo.'
  }
  if (name === 'NotReadableError') {
    return 'A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.'
  }
  return 'Não foi possível abrir a câmera. Tente novamente.'
}

interface QrScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Leitor de QR code: abre o NFT correspondente ao link lido */
export function QrScannerDialog({ open, onOpenChange }: QrScannerDialogProps) {
  const navigate = useNavigate()
  // Estado (e não ref): o Portal do Radix monta o vídeo depois da primeira renderização
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null)
  const scannerRef = React.useRef<QrScannerType | null>(null)
  const [state, setState] = React.useState<ScannerState>({ status: 'starting' })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!open || !video) return
    let cancelled = false
    setState({ status: 'starting' })

    async function start() {
      if (!video) return
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setState({ status: 'error', message: cameraErrorMessage(null) })
        return
      }
      try {
        // Carregado sob demanda para não pesar no carregamento da página
        const { default: QrScanner } = await import('qr-scanner')
        if (cancelled) return
        const scanner = new QrScanner(
          video,
          (result) => {
            const nftId = parseNftQrCode(result.data)
            if (!nftId) {
              scanner.stop()
              setState({ status: 'invalid' })
              return
            }
            scanner.stop()
            onOpenChange(false)
            navigate({ to: '/nft/$nftId', params: { nftId } })
          },
          { preferredCamera: 'environment', maxScansPerSecond: 8, returnDetailedScanResult: true },
        )
        scannerRef.current = scanner
        await scanner.start()
        if (!cancelled) setState({ status: 'scanning' })
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: cameraErrorMessage(error) })
      }
    }

    start()
    return () => {
      cancelled = true
      // Libera a câmera ao fechar
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, [open, video, attempt, navigate, onOpenChange])

  const retry = () => setAttempt((n) => n + 1)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby="qr-scanner-status"
          className="fixed inset-0 z-[60] flex flex-col bg-black font-mono text-kurio-cream motion-safe:animate-hero-fade"
        >
          <div className="relative z-10 flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
            <DialogPrimitive.Title className="text-lg font-semibold">Ler QR code</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar leitor"
              className="grid size-10 place-items-center rounded-full bg-black/40 transition-colors hover:text-kurio-orange-light"
            >
              <X size={22} aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <video
              ref={setVideo}
              muted
              playsInline
              aria-hidden
              className="absolute inset-0 size-full object-cover"
            />

            {/* Moldura de mira */}
            {(state.status === 'starting' || state.status === 'scanning') && (
              <div aria-hidden className="absolute inset-0 grid place-items-center">
                <div className="relative size-64 max-w-[70vw] rounded-3xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.55)]">
                  <span className="absolute inset-0 rounded-3xl border-2 border-kurio-orange" />
                  {state.status === 'scanning' && (
                    <ScanLine
                      size={48}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-kurio-orange/70 motion-safe:animate-pulse"
                    />
                  )}
                </div>
              </div>
            )}

            {(state.status === 'invalid' || state.status === 'error') && (
              <div className="absolute inset-0 grid place-items-center bg-kurio-bg/95 px-8 text-center">
                <div className="flex flex-col items-center">
                  {state.status === 'error' && <CameraOff size={40} aria-hidden className="mb-4 text-kurio-orange-light" />}
                  <p aria-hidden className="max-w-[30ch] text-base leading-6">
                    {state.status === 'invalid' ? 'Este QR code não é de um NFT Kurio.' : state.message}
                  </p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-6 inline-flex h-10 items-center gap-2 rounded-[4px] bg-kurio-orange px-5 font-semibold text-kurio-bg transition-colors hover:bg-kurio-orange-hover"
                  >
                    <RotateCcw size={16} aria-hidden />
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}
          </div>

          <p
            id="qr-scanner-status"
            role="status"
            className={cn(
              'px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] text-center text-sm leading-6',
              // Nos estados de falha a mensagem aparece no centro; aqui fica só para leitores de tela
              (state.status === 'invalid' || state.status === 'error') && 'sr-only',
            )}
          >
            {state.status === 'starting' && 'Abrindo a câmera…'}
            {state.status === 'scanning' && 'Aponte a câmera para o QR code de um NFT Kurio.'}
            {state.status === 'invalid' && 'Este QR code não é de um NFT Kurio.'}
            {state.status === 'error' && state.message}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
