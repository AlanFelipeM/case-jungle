const NFT_PATH = /^\/nft\/([A-Za-z0-9_-]{1,64})\/?$/

/**
 * Extrai o id do NFT de um QR code da Kurio.
 * Aceita o link da página do NFT (ex.: https://kurio.app/nft/nft-001 ou /nft/nft-001).
 * Apenas o id é usado na navegação, então o domínio do link não abre páginas externas.
 */
export function parseNftQrCode(text: string): string | null {
  const value = text.trim()
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return NFT_PATH.exec(url.pathname)?.[1] ?? null
  } catch {
    return null
  }
}
