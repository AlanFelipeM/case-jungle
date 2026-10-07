import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { NftDetailPage } from '@/pages/NftDetailPage'
import { CartPage } from '@/pages/CartPage'
import { PaymentPage } from '@/pages/PaymentPage'
import { OrderPage } from '@/pages/OrderPage'
import { ExplorerPage } from '@/pages/ExplorerPage'
import { ComingSoonPage, NotFoundPage, UnavailablePage } from '@/pages/StatusPage'
import { parseCatalogSearch } from '@/lib/catalogSearch'
import { AuthPage } from '@/pages/AuthPage'
import { getToken } from '@/lib/session'

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

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  beforeLoad: requireAuth,
  component: () => <ComingSoonPage title="Meu perfil" />,
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carteiras',
  beforeLoad: requireAuth,
  component: () => <ComingSoonPage title="Carteiras" />,
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favoritos',
  beforeLoad: requireAuth,
  component: () => <ComingSoonPage title="Lista de interesse" />,
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
  profileRoute,
  favoritesRoute,
  walletsRoute,
  unavailable('/criadores', 'Criadores'),
  unavailable('/aprenda', 'Aprenda'),
  unavailable('/blog/$slug', 'Diário da Cunhagem'),
  unavailable('/ajuda/$', 'Central de ajuda'),
  unavailable('/perfil/colecao', 'Minha coleção'),
  unavailable('/perfil/atividade', 'Atividade'),
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
