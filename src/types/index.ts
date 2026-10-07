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
  username: string
  displayName: string
  email: string
  avatar?: string
  createdAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  /** Momento em que a sessão expira */
  expiresAt: string
}

// ─── Cart ──────────────────────────────────────────────────────────────────
export interface CartItem {
  /** Identidade do item: `${nftId}:${editionId}` */
  id: string
  nftId: string
  editionId: string
  quantity: number
  nft: NFT
  edition: NFTEdition
  /** Preço confirmado pelo colecionador; diferente de nft.price quando o preço mudou */
  priceSnapshot: string
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode?: string
  updatedAt: string
}

// ─── Quote / Order ─────────────────────────────────────────────────────────
/** Cotação de uma linha do carrinho, sempre com o preço atual */
export interface QuoteLine {
  itemId: string
  unitPrice: string
  quantity: number
  total: string
  /** Preço que o colecionador viu ao adicionar/confirmar */
  previousPrice: string
  priceChanged: boolean
  /** Unidades disponíveis (null em edição aberta) */
  available: number | null
  /** Quantidade no carrinho maior que a disponível */
  exceedsAvailability: boolean
}

export interface Quote {
  lines: QuoteLine[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
  coupon: { code: string; percent: number } | null
  couponValid: boolean
  /** Há mudanças de preço não confirmadas ou itens indisponíveis */
  hasIssues: boolean
  expiresAt: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

/** Snapshot do item no momento do pedido (o recibo não muda com o catálogo) */
export interface OrderItem {
  itemId: string
  nftId: string
  editionId: string
  name: string
  image: string
  tokenId: string
  editionLabel: string
  quantity: number
  unitPrice: string
  total: string
}

export interface Order {
  id: string
  idempotencyKey: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
  couponCode?: string
  collector: CheckoutCollector
  wallet: CheckoutWallet
  /** Referência simulada da transação (hash) */
  transactionRef: string
  failureReason?: string
  version: number
  createdAt: string
  updatedAt: string
}

// ─── Checkout ──────────────────────────────────────────────────────────────
export type WalletConnector = 'walletconnect' | 'metamask' | 'coinbase'
export type Network = 'ethereum' | 'polygon' | 'solana'

export interface CollectorProfile {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
}

export interface CheckoutCollector extends CollectorProfile {
  referralCode: string
  note?: string
}

export interface CheckoutWallet {
  /** Carteira cadastrada usada (quando não é informada manualmente) */
  walletId?: string
  address: string
  network: Network
  connector: WalletConnector
  secondary?: string
}

export interface WalletSession {
  id: string
  connector: WalletConnector
  address: string
  network: Network
  connectedAt: string
}

export interface CreateOrderPayload {
  items: { itemId: string; quantity: number; unitPrice: string }[]
  couponCode?: string
  /** Total que o colecionador revisou; diferente do atual → 409 QUOTE_CHANGED */
  expectedTotal: string
  collector: CheckoutCollector
  wallet: CheckoutWallet
  walletSessionId: string
}

// ─── Wallet ────────────────────────────────────────────────────────────────
export interface Wallet {
  id: string
  address: string
  network: Network
  isPrimary: boolean
  label?: string
  /** Nome ENS ou carteira secundária associada (ex.: nova.kurio.eth) */
  ens?: string
  connector: WalletConnector
  /** Dados de identificação da carteira (tela de carteiras) */
  ownerName?: string
  profileName?: string
  email?: string
  ensName?: string
  referralCode?: string
  /** Carteira secundária igual à principal */
  sameAsPrimary?: boolean
}

export type WalletSlot = 'primary' | 'secondary'

export interface WalletInput {
  label: string
  network: Network
  address: string
  ens?: string
  connector: WalletConnector
  ownerName: string
  profileName: string
  email: string
  ensName: string
  referralCode?: string
}

/** Perfil editável da conta */
export interface AccountProfile extends CollectorProfile {
  avatar?: string
}

export interface PasswordChange {
  currentPassword: string
  newPassword: string
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
