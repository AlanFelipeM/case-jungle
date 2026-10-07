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
  createdAt: string
  updatedAt: string
  version: number
}

export interface NFTEdition {
  id: string
  number: number
  available: number
  total: number
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
export interface NFTUpdatedEvent {
  id: string
  resource: 'nft'
  nftId: string
  price: string
  available: number
  version: number
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
