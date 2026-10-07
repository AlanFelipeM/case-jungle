import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEth(value: string | number, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${num.toFixed(decimals)} ETH`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })
}
