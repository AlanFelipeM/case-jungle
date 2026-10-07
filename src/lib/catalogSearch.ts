import type { NFTCategory, NFTListParams, NFTSortOption, NFTTab } from '@/types'

/**
 * Estado do catálogo na URL (busca, filtros, ordenação e paginação).
 * Valores padrão ficam fora da URL para manter links curtos e estáveis.
 */
export interface CatalogSearch {
  q?: string
  category?: NFTCategory
  network?: NFTNetwork
  min?: number
  max?: number
  tab?: NFTTab
  sort?: NFTSortOption
  page?: number
}

export type NFTNetwork = 'ethereum' | 'polygon' | 'solana'

export const PRICE_BOUNDS: [number, number] = [0.02, 12.3]
export const DEFAULT_TAB: NFTTab = 'all'
export const DEFAULT_SORT: NFTSortOption = 'recently-listed'
export const PAGE_SIZE = 9

export const CATEGORIES: NFTCategory[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'coleccionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]
const NETWORKS: NFTNetwork[] = ['ethereum', 'polygon', 'solana']
const TABS: NFTTab[] = ['all', 'new', 'trending']
const SORTS: NFTSortOption[] = ['recently-listed', 'price-asc', 'price-desc', 'newest', 'popular']

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | undefined =>
  list.includes(value as T) ? (value as T) : undefined

function price(value: unknown): number | undefined {
  const n = Number(value)
  if (value === undefined || value === '' || !Number.isFinite(n)) return undefined
  const clamped = Math.min(Math.max(n, PRICE_BOUNDS[0]), PRICE_BOUNDS[1])
  return Math.round(clamped * 100) / 100
}

/** Usado em `validateSearch`: descarta valores inválidos em vez de quebrar a página */
export function parseCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const q = typeof raw.q === 'string' || typeof raw.q === 'number' ? String(raw.q).trim() : ''
  let min = price(raw.min)
  let max = price(raw.max)
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
  const page = Math.floor(Number(raw.page))
  const tab = oneOf(TABS, raw.tab)
  const sort = oneOf(SORTS, raw.sort)

  return {
    q: q ? q.slice(0, 80) : undefined,
    category: oneOf(CATEGORIES, raw.category),
    network: oneOf(NETWORKS, raw.network),
    min: min !== undefined && min > PRICE_BOUNDS[0] ? min : undefined,
    max: max !== undefined && max < PRICE_BOUNDS[1] ? max : undefined,
    tab: tab !== DEFAULT_TAB ? tab : undefined,
    sort: sort !== DEFAULT_SORT ? sort : undefined,
    page: Number.isFinite(page) && page > 1 ? page : undefined,
  }
}

/** Converte o estado da URL nos parâmetros enviados à API */
export function toListParams(search: CatalogSearch): NFTListParams {
  return {
    search: search.q,
    category: search.category,
    network: search.network,
    priceMin: search.min !== undefined ? String(search.min) : undefined,
    priceMax: search.max !== undefined ? String(search.max) : undefined,
    tab: search.tab ?? DEFAULT_TAB,
    sort: search.sort ?? DEFAULT_SORT,
    page: search.page ?? 1,
    limit: PAGE_SIZE,
  }
}

export function countActiveFilters(search: CatalogSearch) {
  return (
    Number(!!search.q) +
    Number(!!search.category) +
    Number(!!search.network) +
    Number(search.min !== undefined || search.max !== undefined)
  )
}
