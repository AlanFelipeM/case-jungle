import type { NFT, NFTCategory, NFTEdition, BlogPost, FeaturedBanner } from '@/types'
import apeSage480 from '@/img/ape-sage-480.webp'
import apeSage900 from '@/img/ape-sage-900.webp'
import apeEmerald480 from '@/img/ape-emerald-480.webp'
import apeEmerald900 from '@/img/ape-emerald-900.webp'
import apeIvory480 from '@/img/ape-ivory-480.webp'
import apeIvory900 from '@/img/ape-ivory-900.webp'
import apeGolden480 from '@/img/ape-golden-480.webp'
import apeGolden900 from '@/img/ape-golden-900.webp'

// NFTs curados: os 9 primeiros reproduzem a primeira página do Figma
/** Dados de origem; edições e informações do detalhe são completadas por enrichNFT */
type NFTSeed = Omit<
  NFT,
  'editions' | 'isRare' | 'imageLarge' | 'tokenId' | 'contractAddress' | 'royaltyPercent' | 'story' | 'rating' | 'reviewCount'
>

const CURATED_NFTS: NFTSeed[] = [
  {
    id: 'nft-001',
    name: 'Emerald Ape #042',
    collectionId: 'col-001',
    collectionName: 'Kurio Apes',
    creatorId: 'usr-002',
    creatorName: 'CryptoArtist',
    image: apeEmerald480,
    price: '1.19',
    network: 'ethereum',
    category: 'arte-digital',
    description: 'Um macaco esmeralda raro da coleção Jungle Apes.',
    attributes: [
      { trait: 'Acessório', value: 'Óculos', rarity: 8 },
      { trait: 'Pedra', value: 'Esmeralda', rarity: 6 },
      { trait: 'Raridade', value: 'Raro', rarity: 3 },
    ],
    isFeatured: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-002',
    name: 'Sage Nomad #009',
    collectionId: 'col-001',
    collectionName: 'Kurio Apes',
    creatorId: 'usr-002',
    creatorName: 'CryptoArtist',
    image: apeSage480,
    price: '1.69',
    network: 'ethereum',
    category: 'arte-digital',
    description: 'O nômade sábio da selva digital.',
    attributes: [
      { trait: 'Background', value: 'Bege', rarity: 20 },
      { trait: 'Chapéu', value: 'Bucket Hat', rarity: 10 },
    ],
    isFeatured: false,
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-16T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-003',
    name: 'Neon Vessel #552',
    collectionId: 'col-002',
    collectionName: 'Neon Primates',
    creatorId: 'usr-003',
    creatorName: 'NeonCreator',
    image: apeIvory480,
    price: '1.99',
    originalPrice: '2.29',
    network: 'ethereum',
    category: 'arte-digital',
    description: 'Vaso neon com estética futurista.',
    attributes: [
      { trait: 'Background', value: 'Neon', rarity: 5 },
      { trait: 'Estilo', value: 'Terno', rarity: 7 },
    ],
    isFeatured: false,
    createdAt: '2026-09-03T00:00:00Z',
    updatedAt: '2026-09-17T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-004',
    name: 'Cosmic Bloom #118',
    collectionId: 'col-003',
    collectionName: 'Cosmic Apes',
    creatorId: 'usr-004',
    creatorName: 'CosmicArt',
    image: apeSage480,
    price: '1.29',
    network: 'polygon',
    category: 'generativa',
    description: 'Florescendo no cosmos digital.',
    attributes: [
      { trait: 'Background', value: 'Roxo', rarity: 18 },
      { trait: 'Roupa', value: 'Moletom', rarity: 22 },
    ],
    isFeatured: true,
    createdAt: '2026-09-04T00:00:00Z',
    updatedAt: '2026-09-18T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-005',
    name: 'Violet Nomad #314',
    collectionId: 'col-001',
    collectionName: 'Kurio Apes',
    creatorId: 'usr-002',
    creatorName: 'CryptoArtist',
    image: apeSage480,
    price: '1.39',
    network: 'ethereum',
    category: 'arte-digital',
    description: 'O nômade violeta da selva.',
    attributes: [
      { trait: 'Background', value: 'Bege', rarity: 20 },
      { trait: 'Chapéu', value: 'Bucket Hat', rarity: 10 },
    ],
    isFeatured: false,
    createdAt: '2026-09-05T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-006',
    name: 'Ivory Baron #088',
    collectionId: 'col-004',
    collectionName: 'Baron Collection',
    creatorId: 'usr-005',
    creatorName: 'BaronMint',
    image: apeIvory480,
    price: '1.79',
    network: 'solana',
    category: 'coleccionaveis',
    description: 'Barão marfim de edição limitada.',
    attributes: [
      { trait: 'Background', value: 'Creme', rarity: 14 },
      { trait: 'Estilo', value: 'Formal', rarity: 9 },
    ],
    isFeatured: false,
    createdAt: '2026-09-06T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-007',
    name: 'Golden Beat #207',
    collectionId: 'col-005',
    collectionName: 'Golden Series',
    creatorId: 'usr-006',
    creatorName: 'GoldMaster',
    image: apeGolden480,
    price: '0.99',
    network: 'ethereum',
    category: 'musica',
    description: 'Batida dourada com fones exclusivos.',
    attributes: [
      { trait: 'Acessório', value: 'Headphones', rarity: 6 },
      { trait: 'Background', value: 'Dourado', rarity: 3 },
    ],
    isFeatured: false,
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-21T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-013',
    name: 'Golden Echo #121',
    collectionId: 'col-005',
    collectionName: 'Golden Series',
    creatorId: 'usr-006',
    creatorName: 'GoldMaster',
    image: apeGolden480,
    price: '0.89',
    network: 'solana',
    category: 'musica',
    description: 'Eco dourado que ressoa pela selva digital.',
    attributes: [
      { trait: 'Acessório', value: 'Headphones', rarity: 6 },
      { trait: 'Background', value: 'Creme', rarity: 14 },
    ],
    isFeatured: false,
    createdAt: '2026-09-07T12:00:00Z',
    updatedAt: '2026-09-21T12:00:00Z',
    version: 1,
  },
  {
    id: 'nft-008',
    name: 'Golden Signal #160',
    collectionId: 'col-005',
    collectionName: 'Golden Series',
    creatorId: 'usr-006',
    creatorName: 'GoldMaster',
    image: apeGolden480,
    price: '0.39',
    network: 'polygon',
    category: 'musica',
    description: 'Sinal dourado transmitindo arte.',
    attributes: [
      { trait: 'Acessório', value: 'Headphones', rarity: 6 },
      { trait: 'Background', value: 'Ciano', rarity: 11 },
    ],
    isFeatured: false,
    createdAt: '2026-09-08T00:00:00Z',
    updatedAt: '2026-09-22T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-009',
    name: 'Ivory Dream #033',
    collectionId: 'col-004',
    collectionName: 'Baron Collection',
    creatorId: 'usr-005',
    creatorName: 'BaronMint',
    image: apeIvory480,
    price: '2.49',
    network: 'ethereum',
    category: 'arte-3d',
    description: 'Sonho em 3D com acabamento marfim.',
    attributes: [
      { trait: 'Renderização', value: '3D', rarity: 2 },
      { trait: 'Background', value: 'Branco', rarity: 25 },
    ],
    isFeatured: false,
    createdAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-010',
    name: 'Forest King #071',
    collectionId: 'col-001',
    collectionName: 'Kurio Apes',
    creatorId: 'usr-002',
    creatorName: 'CryptoArtist',
    image: apeEmerald480,
    price: '3.10',
    network: 'ethereum',
    category: 'arte-digital',
    description: 'Rei da floresta digital, edição única.',
    attributes: [
      { trait: 'Raridade', value: 'Lendário', rarity: 1 },
      { trait: 'Coroa', value: 'Ouro', rarity: 1 },
    ],
    isFeatured: false,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-24T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-011',
    name: 'Pixel Sage #202',
    collectionId: 'col-006',
    collectionName: 'Pixel World',
    creatorId: 'usr-007',
    creatorName: 'PixelMaker',
    image: apeSage480,
    price: '0.75',
    network: 'solana',
    category: 'jogos',
    description: 'Sábio pixelado do mundo digital.',
    attributes: [
      { trait: 'Estilo', value: 'Pixel Art', rarity: 30 },
    ],
    isFeatured: false,
    createdAt: '2026-09-11T00:00:00Z',
    updatedAt: '2026-09-25T00:00:00Z',
    version: 1,
  },
  {
    id: 'nft-012',
    name: 'Sunset Baron #415',
    collectionId: 'col-004',
    collectionName: 'Baron Collection',
    creatorId: 'usr-005',
    creatorName: 'BaronMint',
    image: apeIvory480,
    price: '1.55',
    network: 'polygon',
    category: 'fotografia',
    description: 'Barão ao pôr do sol digital.',
    attributes: [
      { trait: 'Luz', value: 'Pôr do Sol', rarity: 8 },
    ],
    isFeatured: false,
    createdAt: '2026-09-12T00:00:00Z',
    updatedAt: '2026-09-26T00:00:00Z',
    version: 1,
  },
]

// ─── Catálogo gerado ───────────────────────────────────────────────────────
// Completa o catálogo de forma determinística (dados estáveis para os testes
// de regressão visual) até que o total por categoria seja o mesmo do Figma.
const FIGMA_CATEGORY_TOTALS: Record<NFTCategory, number> = {
  'arte-digital': 33,
  fotografia: 12,
  musica: 65,
  'arte-3d': 39,
  coleccionaveis: 23,
  generativa: 17,
  jogos: 19,
  assinaturas: 13,
  utilidade: 18,
}

const TEMPLATES = [
  { suffix: 'Ape', image: apeEmerald480, collectionId: 'col-001', collectionName: 'Kurio Apes', creatorId: 'usr-002', creatorName: 'CryptoArtist', background: 'Verde' },
  { suffix: 'Nomad', image: apeSage480, collectionId: 'col-003', collectionName: 'Cosmic Apes', creatorId: 'usr-004', creatorName: 'CosmicArt', background: 'Bege' },
  { suffix: 'Baron', image: apeIvory480, collectionId: 'col-004', collectionName: 'Baron Collection', creatorId: 'usr-005', creatorName: 'BaronMint', background: 'Menta' },
  { suffix: 'Beat', image: apeGolden480, collectionId: 'col-005', collectionName: 'Golden Series', creatorId: 'usr-006', creatorName: 'GoldMaster', background: 'Creme' },
] as const

const PREFIXES = ['Amber', 'Jade', 'Lunar', 'Velvet', 'Copper', 'Onyx', 'Coral', 'Misty', 'Solar', 'Rustic', 'Silent', 'Wild']
const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
const DAY = 86_400_000

function generateNFTs(): NFTSeed[] {
  const remaining = { ...FIGMA_CATEGORY_TOTALS }
  CURATED_NFTS.forEach((nft) => remaining[nft.category]--)

  // Intercala as categorias para que cada página tenha variedade
  const categories = (Object.entries(remaining) as [NFTCategory, number][])
    .flatMap(([category, count]) => Array.from({ length: count }, (_, n) => ({ category, n })))
    .sort((a, b) => a.n - b.n)
    .map(({ category }) => category)

  return categories.map((category, i) => {
    const tpl = TEMPLATES[(i * 3 + 1) % TEMPLATES.length]
    const name = `${PREFIXES[i % PREFIXES.length]} ${tpl.suffix} #${String(100 + ((i * 53) % 900)).padStart(3, '0')}`
    const price = (((i * 0.47) % 12.2) + 0.05).toFixed(2)
    return {
      id: `nft-g${String(i + 1).padStart(3, '0')}`,
      name,
      collectionId: tpl.collectionId,
      collectionName: tpl.collectionName,
      creatorId: tpl.creatorId,
      creatorName: tpl.creatorName,
      image: tpl.image,
      price,
      originalPrice: i % 9 === 0 ? (parseFloat(price) * 1.15).toFixed(2) : undefined,
      network: NETWORKS[i % NETWORKS.length],
      category,
      description: `${name}, da coleção ${tpl.collectionName}.`,
      attributes: [{ trait: 'Background', value: tpl.background, rarity: 5 + (i % 30) }],
      isFeatured: false,
      createdAt: new Date(Date.UTC(2026, 7, 1) + (i % 60) * DAY).toISOString(),
      updatedAt: '',
      version: 1,
    }
  })
}

// ─── Informações do detalhe ────────────────────────────────────────────────

const LARGE_IMAGES: Record<string, string> = {
  [apeEmerald480]: apeEmerald900,
  [apeSage480]: apeSage900,
  [apeIvory480]: apeIvory900,
  [apeGolden480]: apeGolden900,
}

const NETWORK_LABELS: Record<NFT['network'], string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

// NFTs curados que recebem o selo "Raro" (os gerados recebem por regra)
const RARE_IDS = new Set(['nft-003', 'nft-009', 'nft-010'])

/** Quatro edições por NFT, com disponibilidade determinística (algumas esgotadas) */
function buildEditions(id: string, i: number): NFTEdition[] {
  return [
    { id: `${id}-1-1`, label: '1/1', total: 1, available: i % 3 === 2 ? 0 : 1 },
    { id: `${id}-1-10`, label: '1/10', total: 10, available: (i * 3) % 11 },
    { id: `${id}-1-50`, label: '1/50', total: 50, available: 3 + ((i * 13) % 48) },
    { id: `${id}-aberta`, label: 'Aberta', total: null, available: null },
  ]
}

/** Hash simples e estável para derivar um endereço de contrato fictício */
function fakeAddress(seed: string): string {
  let h = 2166136261
  let out = ''
  for (let round = 0; out.length < 40; round++) {
    for (const ch of seed + round) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
    out += h.toString(16).padStart(8, '0')
  }
  return '0x' + out.slice(0, 40).toUpperCase()
}

function enrichNFT(seed: NFTSeed, i: number): NFT {
  const network = NETWORK_LABELS[seed.network]
  const number = seed.name.match(/#(\d+)/)?.[1] ?? String(i + 1)
  const royaltyPercent = 5
  return {
    ...seed,
    description: `Um colecionável digital finalizado à mão da coleção ${seed.collectionName}, verificado na ${network}, com arte desbloqueável e acesso para colecionadores.`,
    editions: buildEditions(seed.id, i),
    isRare: RARE_IDS.has(seed.id) || (i >= CURATED_NFTS.length && i % 7 === 3),
    imageLarge: LARGE_IMAGES[seed.image] ?? seed.image,
    tokenId: '#' + number.padStart(4, '0'),
    contractAddress: fakeAddress(seed.collectionId),
    royaltyPercent,
    story: [
      `${seed.name} é uma obra digital finalizada à mão da coleção ${seed.collectionName}. Cada atributo fica armazenado nos metadados do token e verificado na ${network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${seed.creatorName} recebe ${royaltyPercent}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    rating: i === 0 ? 4.9 : Math.min(5, 4 + ((i * 7) % 11) / 10),
    reviewCount: i === 0 ? 19 : 3 + ((i * 11) % 27),
  }
}

// "Listados recentemente" ordena por updatedAt: a ordem do array define a ordem da listagem
const LISTING_START = Date.UTC(2026, 8, 30, 12)
export const MOCK_NFTS: NFT[] = [...CURATED_NFTS, ...generateNFTs()].map((seed, i) =>
  enrichNFT({ ...seed, updatedAt: new Date(LISTING_START - i * 3_600_000).toISOString() }, i),
)

function countBy(key: 'category' | 'network'): Record<string, number> {
  return MOCK_NFTS.reduce<Record<string, number>>((acc, nft) => {
    acc[nft[key]] = (acc[nft[key]] ?? 0) + 1
    return acc
  }, {})
}

export const FEATURED_NFT: NFT = {
  ...MOCK_NFTS[3],
  image: apeSage900,
  isFeatured: true,
}

export const MOCK_BANNERS: FeaturedBanner[] = [
  {
    id: 'banner-001',
    title: 'Seja dono do futuro da arte digital',
    subtitle: 'Bem-vindo à Kurio',
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    ctaLabel: 'Explorar',
    ctaHref: '/#catalogo',
    image: apeEmerald900,
    imageSrcSet: `${apeEmerald480} 480w, ${apeEmerald900} 900w`,
    imageAlt: 'Emerald Ape: macaco com óculos redondos, jaqueta college verde e colar de esmeralda',
    mobileTitle: 'Seja dono da cultura digital',
    mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
    accentImage: apeSage480,
  },
  {
    id: 'banner-002',
    title: 'Novas coleções toda semana',
    subtitle: 'Lançamentos desta semana',
    description:
      'As últimas criações dos melhores artistas digitais do mundo, com edições limitadas e procedência verificada.',
    ctaLabel: 'Ver coleções',
    ctaHref: '/?tab=new#catalogo',
    image: apeIvory900,
    imageSrcSet: `${apeIvory480} 480w, ${apeIvory900} 900w`,
    imageAlt: 'Ivory Baron: gorila de pelo escuro com gola alta verde e blazer creme',
    mobileTitle: 'Novas coleções toda semana',
    mobileDescription: 'Edições limitadas com procedência verificada.',
    accentImage: apeGolden480,
  },
  {
    id: 'banner-003',
    title: 'Os NFTs mais cobiçados agora',
    subtitle: 'Em alta',
    description:
      'As peças mais disputadas da semana, escolhidas pela comunidade. Não perca a chance de colecionar.',
    ctaLabel: 'Ver em alta',
    ctaHref: '/?tab=trending#catalogo',
    image: apeGolden900,
    imageSrcSet: `${apeGolden480} 480w, ${apeGolden900} 900w`,
    imageAlt: 'Golden Beat: macaco dourado com fones de ouvido verdes e jaqueta creme',
    mobileTitle: 'Os mais cobiçados agora',
    mobileDescription: 'As peças mais disputadas da semana.',
    accentImage: apeEmerald480,
  },
]

export const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-001',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: apeIvory480,
    date: '12 de setembro',
    readTime: 6,
    slug: 'como-funciona-propriedade-nfts',
  },
  {
    id: 'post-002',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    image: apeEmerald480,
    date: '13 de setembro',
    readTime: 2,
    slug: '10-artistas-digitais-para-acompanhar',
  },
  {
    id: 'post-003',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: apeSage480,
    date: '15 de setembro',
    readTime: 3,
    slug: 'raridade-atributos-procedencia',
  },
  {
    id: 'post-004',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: apeGolden480,
    date: '15 de setembro',
    readTime: 2,
    slug: 'como-proteger-sua-carteira',
  },
]

export const CATEGORY_COUNTS = countBy('category')

export const NETWORK_COUNTS = countBy('network')
