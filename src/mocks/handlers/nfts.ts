import { http, HttpResponse, delay } from 'msw'
import type { NFTListParams, NFTReview, NFTReviewsResponse } from '@/types'
import {
  MOCK_NFTS,
  MOCK_BANNERS,
  MOCK_BLOG_POSTS,
  CATEGORY_COUNTS,
  NETWORK_COUNTS,
  FEATURED_NFT,
} from '@/mocks/fixtures/nfts'

const BASE = '/api'

const REVIEW_AUTHORS = ['ana.eth', 'colecionador_br', 'pixelmonk', 'luiza.nft', 'rafa_mint', 'jungle.dao', 'marina.art', 'theo.eth']
const REVIEW_COMMENTS = [
  'Arte impecável em alta resolução, chegou na carteira em segundos.',
  'Procedência verificada e metadados completos. Recomendo a coleção.',
  'Os detalhes de luz e textura impressionam ainda mais no zoom.',
  'Compra tranquila, edição bem documentada e criador muito presente.',
  'Uma das peças favoritas da minha coleção, ótimo custo-benefício.',
  'Acesso aos lançamentos exclusivos já valeu a aquisição.',
]

// Helper to simulate variable network latency
async function simulateLatency(ms = 300) {
  await delay(ms + Math.random() * 200)
}

export const nftHandlers = [
  // GET /api/nfts — list with filters, sort, pagination
  http.get(`${BASE}/nfts`, async ({ request }) => {
    await simulateLatency()
    const url = new URL(request.url)
    const params: NFTListParams = {
      search: url.searchParams.get('search') || undefined,
      category: (url.searchParams.get('category') as NFTListParams['category']) || undefined,
      collection: url.searchParams.get('collection') || undefined,
      priceMin: url.searchParams.get('priceMin') || undefined,
      priceMax: url.searchParams.get('priceMax') || undefined,
      network: url.searchParams.get('network') || undefined,
      sort: (url.searchParams.get('sort') as NFTListParams['sort']) || 'recently-listed',
      tab: (url.searchParams.get('tab') as NFTListParams['tab']) || 'all',
      page: Number(url.searchParams.get('page') || 1),
      limit: Number(url.searchParams.get('limit') || 9),
    }

    let results = [...MOCK_NFTS]

    // Filter by tab
    if (params.tab === 'new') {
      results = results.filter((n) => new Date(n.createdAt) > new Date('2026-09-10'))
    } else if (params.tab === 'trending') {
      results = results.slice(0, 6)
    }

    // Filter by search
    if (params.search) {
      const q = params.search.toLowerCase()
      results = results.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.collectionName.toLowerCase().includes(q) ||
          n.creatorName.toLowerCase().includes(q),
      )
    }

    // Filter by collection
    if (params.collection) {
      results = results.filter((n) => n.collectionId === params.collection)
    }

    // Filter by category
    if (params.category) {
      results = results.filter((n) => n.category === params.category)
    }

    // Filter by network
    if (params.network) {
      results = results.filter((n) => n.network === params.network)
    }

    // Filter by price range
    if (params.priceMin) {
      results = results.filter((n) => parseFloat(n.price) >= parseFloat(params.priceMin!))
    }
    if (params.priceMax) {
      results = results.filter((n) => parseFloat(n.price) <= parseFloat(params.priceMax!))
    }

    // Sort
    switch (params.sort) {
      case 'price-asc':
        results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        break
      case 'price-desc':
        results.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
        break
      case 'popular': {
        const sold = (n: (typeof results)[number]) =>
          n.editions.reduce(
            (sum, e) => sum + (e.total !== null && e.available !== null ? e.total - e.available : 0),
            0,
          )
        results.sort((a, b) => sold(b) - sold(a))
        break
      }
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      default:
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }

    // Pagination
    const total = results.length
    const page = params.page ?? 1
    const limit = params.limit ?? 9
    const start = (page - 1) * limit
    const data = results.slice(start, start + limit)

    return HttpResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  }),

  // GET /api/nfts/featured — featured NFT
  // (registrado antes de /nfts/:id; o MSW usa o primeiro handler que casar)
  http.get(`${BASE}/nfts/featured`, async () => {
    await simulateLatency(150)
    return HttpResponse.json(FEATURED_NFT)
  }),

  // GET /api/nfts/:id/reviews — avaliações de colecionadores
  http.get(`${BASE}/nfts/:id/reviews`, async ({ params: routeParams }) => {
    await simulateLatency(200)
    const nft = MOCK_NFTS.find((n) => n.id === routeParams.id)
    if (!nft) {
      return HttpResponse.json({ error: 'NFT não encontrado' }, { status: 404 })
    }
    const items: NFTReview[] = Array.from({ length: nft.reviewCount }, (_, i) => {
      const seed = nft.id.length * 31 + i * 17
      return {
        id: `${nft.id}-review-${i + 1}`,
        author: REVIEW_AUTHORS[seed % REVIEW_AUTHORS.length],
        rating: i % 6 === 5 ? 4 : 5,
        comment: REVIEW_COMMENTS[(seed + i) % REVIEW_COMMENTS.length],
        date: new Date(Date.UTC(2026, 8, 28) - i * 86_400_000 * 2).toISOString(),
      }
    })
    const body: NFTReviewsResponse = { items, total: items.length, average: nft.rating }
    return HttpResponse.json(body)
  }),

  // GET /api/nfts/:id — detail
  http.get(`${BASE}/nfts/:id`, async ({ params: routeParams }) => {
    await simulateLatency()
    const nft = MOCK_NFTS.find((n) => n.id === routeParams.id)
    if (!nft) {
      return HttpResponse.json({ error: 'NFT não encontrado' }, { status: 404 })
    }
    return HttpResponse.json(nft)
  }),

  // GET /api/banners — featured hero banners
  http.get(`${BASE}/banners`, async () => {
    await simulateLatency(100)
    return HttpResponse.json(MOCK_BANNERS)
  }),

  // GET /api/blog — blog posts
  http.get(`${BASE}/blog`, async () => {
    await simulateLatency(150)
    return HttpResponse.json(MOCK_BLOG_POSTS)
  }),


  // GET /api/meta — category & network counts
  http.get(`${BASE}/meta`, async () => {
    await simulateLatency(100)
    return HttpResponse.json({ categories: CATEGORY_COUNTS, networks: NETWORK_COUNTS })
  }),

  // POST /api/newsletter — fora do escopo da demonstração (README §3): valida o
  // e-mail, mas não simula sucesso de uma ação auxiliar não implementada
  http.post(`${BASE}/newsletter`, async ({ request }) => {
    await simulateLatency(300)
    const { email } = (await request.json()) as { email?: string }
    if (!email || !/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
      return HttpResponse.json({ error: 'Informe um e-mail válido.' }, { status: 422 })
    }
    return HttpResponse.json(
      { error: 'A newsletter não está disponível nesta demonstração.', code: 'NOT_AVAILABLE' },
      { status: 501 },
    )
  }),
]
