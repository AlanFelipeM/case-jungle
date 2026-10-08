import React from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
  type RouteComponent,
} from '@tanstack/react-router'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { NftDetailPage } from '@/pages/NftDetailPage'
import { NotFoundPage, UnavailablePage } from '@/pages/StatusPage'
import { parseCatalogSearch } from '@/lib/catalogSearch'
import { getToken } from '@/lib/session'

// Início e detalhe (telas de entrada mais comuns) ficam no bundle principal; as demais rotas
// carregam sob demanda e são pré-carregadas na intenção de navegação (hover/foco nos links)
const CartPage = lazyRouteComponent(() => import('@/pages/CartPage'), 'CartPage')
const PaymentPage = lazyRouteComponent(() => import('@/pages/PaymentPage'), 'PaymentPage')
const OrderPage = lazyRouteComponent(() => import('@/pages/OrderPage'), 'OrderPage')
const ExplorerPage = lazyRouteComponent(() => import('@/pages/ExplorerPage'), 'ExplorerPage')
const AuthPage = lazyRouteComponent(() => import('@/pages/AuthPage'), 'AuthPage')
const ProfileLayout = lazyRouteComponent(() => import('@/pages/profile/ProfileLayout'), 'ProfileLayout')
// Com props: React.lazy preserva a tipagem (o roteador já renderiza dentro de Suspense)
const ProfileUnavailable = React.lazy(() =>
  import('@/pages/profile/ProfileLayout').then((m) => ({ default: m.ProfileUnavailable })),
)
const ProfileDataPage = lazyRouteComponent(() => import('@/pages/profile/ProfileDataPage'), 'ProfileDataPage')
const WalletsPage = lazyRouteComponent(() => import('@/pages/profile/WalletsPage'), 'WalletsPage')
const FavoritesListPage = lazyRouteComponent(() => import('@/pages/profile/FavoritesListPage'), 'FavoritesListPage')

/** Parâmetros de /login e /cadastro: retorno ao fluxo anterior e motivo */
const authSearch = (raw: Record<string, unknown>): { redirect?: string; reason?: 'expired' } => ({
  // Apenas caminhos internos, para evitar open redirect
  redirect:
    typeof raw.redirect === 'string' && raw.redirect.startsWith('/') && !raw.redirect.startsWith('//')
      ? raw.redirect
      : undefined,
  reason: raw.reason === 'expired' ? 'expired' : undefined,
})

/** Telas privadas: sem sessão, vai ao login e volta depois */
const requireAuth = ({ location }: { location: { href: string } }) => {
  if (!getToken()) throw redirect({ to: '/login', search: { redirect: location.href } })
}

// Root route with shared layout
const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
  notFoundComponent: NotFoundPage,
})

// Home — busca, filtros, ordenação e paginação vivem na URL
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: parseCatalogSearch,
  component: HomePage,
})

// O catálogo do Mercado é o mesmo da Home
const mercadoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mercado',
  beforeLoad: () => {
    throw redirect({ to: '/', hash: 'catalogo', replace: true })
  },
})

// Detalhe do NFT (acesso direto pela URL)
const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: NftDetailPage,
})

// Telas do escopo ainda em implementação
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: authSearch,
  component: () => <AuthPage mode="login" />,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  validateSearch: authSearch,
  component: () => <AuthPage mode="register" />,
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  component: CartPage,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pagamento',
  beforeLoad: requireAuth,
  component: PaymentPage,
})

// Explorador de blocos simulado (links de exploração do recibo)
const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/explorador/tx/$hash',
  validateSearch: (raw: Record<string, unknown>): { pedido?: string } => ({
    pedido: typeof raw.pedido === 'string' ? raw.pedido : undefined,
  }),
  component: ExplorerPage,
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedido/$orderId',
  beforeLoad: requireAuth,
  component: OrderPage,
})

// ─── Meu perfil (área privada com navegação lateral) ──────────────────────
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  beforeLoad: requireAuth,
  component: ProfileLayout,
})

const profileSection = <TPath extends string>(path: TPath, component: RouteComponent) =>
  createRoute({ getParentRoute: () => profileRoute, path, component })

const profileChildren = [
  profileSection('/', ProfileDataPage),
  profileSection('carteiras', WalletsPage),
  profileSection('lista-de-interesse', FavoritesListPage),
  // Fora do escopo da entrega (README §3): exibidas como indisponíveis
  profileSection('atividade', () => <ProfileUnavailable title="Atividade" />),
  profileSection('ofertas', () => <ProfileUnavailable title="Ofertas" />),
  profileSection('arquivos-baixados', () => <ProfileUnavailable title="Arquivos baixados" />),
  profileSection('suporte', () => <ProfileUnavailable title="Suporte" />),
  profileSection('colecao', () => <ProfileUnavailable title="Minha coleção" />),
] as const

// Endereços antigos continuam funcionando
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carteiras',
  beforeLoad: () => {
    throw redirect({ to: '/perfil/carteiras', replace: true })
  },
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favoritos',
  beforeLoad: () => {
    throw redirect({ to: '/perfil/lista-de-interesse', replace: true })
  },
})

// Seções editoriais/auxiliares fora do escopo (README §3)
const unavailable = <TPath extends string>(path: TPath, title: string) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: () => <UnavailablePage title={title} />,
  })

const routeTree = rootRoute.addChildren([
  homeRoute,
  mercadoRoute,
  nftDetailRoute,
  loginRoute,
  registerRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  explorerRoute,
  profileRoute.addChildren(profileChildren),
  favoritesRoute,
  walletsRoute,
  unavailable('/criadores', 'Criadores'),
  unavailable('/aprenda', 'Aprenda'),
  unavailable('/blog/$slug', 'Diário da Cunhagem'),
  unavailable('/ajuda/$', 'Central de ajuda'),
  unavailable('/estudio', 'Estúdio do criador'),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
