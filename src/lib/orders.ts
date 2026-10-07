import type { Network } from '@/types'

/** "29 Jul, 2026" */
export function formatOrderDate(iso: string) {
  const date = new Date(iso)
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${date.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}

/** "0xA91F…E82C" */
export const shortHash = (value: string) => (value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value)

/** Explorador de blocos da rede (simulado no ambiente de demonstração) */
export const EXPLORERS: Record<Network, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}
