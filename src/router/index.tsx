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
import { ComingSoonPage, NotFoundPage, UnavailablePage } from '@/pages/StatusPage'
import { parseCatalogSearch } from '@/lib/catalogSearch'

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
  validateSearch: (raw: Record<string, unknown>): { redirect?: string } => ({
    // Apenas caminhos internos, para evitar open redirect
    redirect:
      typeof raw.redirect === 'string' && raw.redirect.startsWith('/') && !raw.redirect.startsWith('//')
        ? raw.redirect
        : undefined,
  }),
  component: () => <ComingSoonPage title="Entrar" />,
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  component: () => <ComingSoonPage title="Carrinho" />,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  component: () => <ComingSoonPage title="Meu perfil" />,
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favoritos',
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
  cartRoute,
  profileRoute,
  favoritesRoute,
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
