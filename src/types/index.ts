// ─── NFT ───────────────────────────────────────────────────────────────────
export interface NFT {
  id: string
  name: string
  collectionId: string
  collectionName: string
  creatorId: string
  creatorName: string
  image: string
  price: string          // ETH as decimal string
  originalPrice?: string // original price if on sale
  network: 'ethereum' | 'polygon' | 'solana'
  category: NFTCategory
  editions: NFTEdition[]
  description: string
  attributes: NFTAttribute[]
  isFeatured: boolean
  /** Selo "Raro" nos cards */
  isRare: boolean
  createdAt: string
  updatedAt: string
  version: number
  // ─── Informações do detalhe ───
  /** Imagem em alta resolução (galeria) */
  imageLarge: string
  tokenId: string
  contractAddress: string
  /** Percentual de direitos autorais do criador nas vendas secundárias */
  royaltyPercent: number
  /** Texto longo da aba "Detalhes do NFT" */
  story: string[]
  rating: number
  reviewCount: number
}

export interface NFTEdition {
  id: string
  /** Rótulo exibido: "1/1", "1/10", "1/50" ou "Aberta" */
  label: string
  /** Tiragem total; null para edição aberta */
  total: number | null
  /** Unidades disponíveis; null para edição aberta (sem limite de estoque) */
  available: number | null
}

/** Limite de unidades por pedido, inclusive em edições abertas */
export const MAX_QUANTITY_PER_ORDER = 10

export interface NFTReview {
  id: string
  author: string
  rating: number
  comment: string
  date: string
}

export interface NFTReviewsResponse {
  items: NFTReview[]
  total: number
  average: number
}

export interface NFTAttribute {
  trait: string
  value: string
  rarity: number // percentage
}

export type NFTCategory =
  | 'arte-digital'
  | 'fotografia'
  | 'musica'
  | 'arte-3d'
  | 'coleccionaveis'
  | 'generativa'
  | 'jogos'
  | 'assinaturas'
  | 'utilidade'

export type NFTSortOption =
  | 'recently-listed'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'popular'

export type NFTTab = 'all' | 'new' | 'trending'

// ─── NFT List ──────────────────────────────────────────────────────────────
export interface NFTListParams {
  search?: string
  collection?: string
  category?: NFTCategory
  priceMin?: string
  priceMax?: string
  network?: string
  sort?: NFTSortOption
  tab?: NFTTab
  page?: number
  limit?: number
}

export interface NFTListResponse {
  data: NFT[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Blog Post ─────────────────────────────────────────────────────────────
export interface BlogPost {
  id: string
  title: string
  excerpt: string
  image: string
  date: string
  readTime: number
  slug: string
}

// ─── Featured Banner ───────────────────────────────────────────────────────
export interface FeaturedBanner {
  id: string
  title: string
  subtitle: string
  description: string
  ctaLabel: string
  ctaHref: string
  image: string
  /** Variantes responsivas da imagem (atributo `srcset`) */
  imageSrcSet?: string
  imageAlt: string
  /** Versões curtas exibidas no mobile */
  mobileTitle?: string
  mobileDescription?: string
  /** Miniatura sobreposta à imagem principal (mobile) */
  accentImage?: string
}

// ─── User / Auth ───────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  createdAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

// ─── Cart ──────────────────────────────────────────────────────────────────
export interface CartItem {
  nftId: string
  editionId: string
  quantity: number
  nft: NFT
  edition: NFTEdition
  priceSnapshot: string
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode?: string
  updatedAt: string
}

// ─── Quote / Order ─────────────────────────────────────────────────────────
export interface Quote {
  subtotal: string
  discount: string
  networkFee: string
  total: string
  couponValid: boolean
  expiresAt: string
}

export interface Order {
  id: string
  idempotencyKey: string
  status: 'pending' | 'confirmed' | 'rejected'
  items: CartItem[]
  quote: Quote
  transactionRef: string
  createdAt: string
  updatedAt: string
}

// ─── Wallet ────────────────────────────────────────────────────────────────
export interface Wallet {
  id: string
  address: string
  network: 'ethereum' | 'polygon' | 'solana'
  isPrimary: boolean
  label?: string
}

// ─── Socket Events ─────────────────────────────────────────────────────────
/** Evento Socket.IO "nft.updated": preço e disponibilidade atuais de um NFT */
export interface NFTUpdatedEvent {
  /** Identidade estável do evento (deduplicação) */
  id: string
  resource: 'nft'
  nftId: string
  /** Versão do recurso: eventos com versão menor ou igual à conhecida são ignorados */
  version: number
  price: string
  editions: { id: string; available: number | null }[]
  timestamp: string
}

export interface OrderUpdatedEvent {
  id: string
  resource: 'order'
  orderId: string
  status: 'pending' | 'confirmed' | 'rejected'
  version: number
  timestamp: string
}
