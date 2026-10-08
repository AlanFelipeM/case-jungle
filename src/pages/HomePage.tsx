import React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Settings2, SlidersHorizontal, X } from 'lucide-react'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CatalogFilters, CatalogTabs, SortOptions } from '@/components/home/CatalogFilters'
import { SearchIcon } from '@/components/icons'
import { FeaturedNFTCard } from '@/components/home/FeaturedNFTCard'
import { PromoSection } from '@/components/home/PromoSection'
import { BlogSection } from '@/components/home/BlogSection'
import { NFTCard } from '@/components/ui/NFTCard'
import { NFTGridSkeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useNFTs, useFeaturedNFT } from '@/hooks/useNFTs'
import {
  DEFAULT_SORT,
  DEFAULT_TAB,
  PRICE_BOUNDS,
  countActiveFilters,
  toListParams,
  type CatalogSearch,
} from '@/lib/catalogSearch'
import { cn } from '@/lib/utils'

export function HomePage() {
  // Busca, filtros, ordenação e paginação vêm da URL (refresh e histórico preservam o estado)
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const catalogRef = React.useRef<HTMLElement>(null)
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  /** Atualiza a URL; qualquer mudança de filtro reinicia a paginação */
  const updateSearch = React.useCallback(
    (patch: Partial<CatalogSearch>) => {
      navigate({
        search: (prev) => ({ ...prev, page: undefined, ...patch }),
        resetScroll: false,
      })
    },
    [navigate],
  )

  const currentPage = search.page ?? 1
  const { data: nftsData, isLoading: nftsLoading, isError, isFetching, refetch } = useNFTs(
    toListParams(search),
  )
  const { data: featuredNFT } = useFeaturedNFT()

  // Página fora do intervalo (ex.: link antigo) → última página válida
  React.useEffect(() => {
    if (nftsData && nftsData.totalPages > 0 && currentPage > nftsData.totalPages) {
      navigate({ search: (prev) => ({ ...prev, page: nftsData.totalPages }), replace: true, resetScroll: false })
    }
  }, [nftsData, currentPage, navigate])

  const activeFilterCount = countActiveFilters(search)
  const priceRange: [number, number] = [search.min ?? PRICE_BOUNDS[0], search.max ?? PRICE_BOUNDS[1]]

  function clearFilters() {
    updateSearch({ q: undefined, category: undefined, network: undefined, min: undefined, max: undefined })
  }

  function changePage(page: number) {
    updateSearch({ page: page > 1 ? page : undefined })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    catalogRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  const filters = (
    <CatalogFilters
      selectedCategory={search.category}
      onCategoryChange={(category) => updateSearch({ category })}
      priceRange={priceRange}
      onPriceChange={([min, max]) =>
        updateSearch({
          min: min > PRICE_BOUNDS[0] ? min : undefined,
          max: max < PRICE_BOUNDS[1] ? max : undefined,
        })
      }
      selectedNetwork={search.network}
      onNetworkChange={(network) => updateSearch({ network: network as CatalogSearch['network'] })}
    />
  )

  return (
    <>
      {/* Busca + filtros (mobile) */}
      <div className="px-5 pt-6 md:hidden">
        <MobileSearchBar
          query={search.q}
          onSearch={(q) => updateSearch({ q })}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
        />
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-[1440px] px-5 pt-4 pb-6 md:px-6 md:pt-8 md:pb-12">
        <HeroBanner />
      </div>

      {/* Catalog section */}
      <section
        ref={catalogRef}
        id="catalogo"
        aria-labelledby="catalog-heading"
        className="mx-auto max-w-[1440px] scroll-mt-6 px-5 md:mt-10 md:scroll-mt-20 md:px-6"
      >
        <h2 id="catalog-heading" className="sr-only">
          Catálogo de NFTs
        </h2>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent title="Filtros" className="bg-kurio-surface">
          <SortOptions
            className="md:hidden"
            sortBy={search.sort ?? DEFAULT_SORT}
            onSortChange={(sort) => updateSearch({ sort: sort !== DEFAULT_SORT ? sort : undefined })}
          />
          {filters}
        </SheetContent>
        <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[260px_1fr] lg:gap-10 xl:grid-cols-[310px_1fr] xl:gap-12">
          {/* Sidebar (desktop) */}
          <aside aria-label="Filtros do catálogo" className="hidden lg:flex lg:flex-col lg:gap-6">
            {filters}
            {featuredNFT && <FeaturedNFTCard nft={featuredNFT} />}
          </aside>

          {/* Main catalog */}
          <div className="min-w-0">
            <CatalogTabs
              selectedTab={search.tab ?? DEFAULT_TAB}
              onTabChange={(tab) => updateSearch({ tab: tab !== DEFAULT_TAB ? tab : undefined })}
              sortBy={search.sort ?? DEFAULT_SORT}
              onSortChange={(sort) => updateSearch({ sort: sort !== DEFAULT_SORT ? sort : undefined })}
              action={
                <SheetTrigger className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-kurio-outline px-3 transition-colors hover:border-kurio-orange lg:hidden">
                  <SlidersHorizontal size={16} aria-hidden />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-kurio-orange text-xs font-semibold text-kurio-bg">
                      {activeFilterCount}
                      <span className="sr-only"> ativos</span>
                    </span>
                  )}
                </SheetTrigger>
              }
            />

            {/* Busca ativa */}
            {search.q && (
              <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-sm">
                <p className="text-kurio-sand">
                  Resultados para <span className="text-kurio-cream">“{search.q}”</span>
                </p>
                <button
                  type="button"
                  onClick={() => updateSearch({ q: undefined })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-kurio-outline px-2.5 text-kurio-cream transition-colors hover:border-kurio-orange hover:text-kurio-orange-light"
                >
                  <X size={14} aria-hidden />
                  Limpar busca
                </button>
              </div>
            )}

            <p className="sr-only" role="status">
              {nftsData ? `${nftsData.total} NFTs encontrados` : ''}
            </p>

            <div className="mt-4 md:mt-[22px]">
              {nftsLoading ? (
                <NFTGridSkeleton count={9} />
              ) : isError ? (
                <div className="flex flex-col items-center py-20 text-center font-mono" role="alert">
                  <p className="text-lg text-kurio-cream">Erro ao carregar NFTs</p>
                  <p className="mt-2 text-sm text-kurio-sand">Verifique sua conexão e tente novamente.</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-6 h-[35px] rounded-[4px] bg-kurio-orange px-4 font-semibold text-kurio-bg transition-colors hover:bg-kurio-orange-hover"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : nftsData?.data.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center font-mono">
                  <p className="text-lg text-kurio-cream">Nenhum NFT encontrado</p>
                  <p className="mt-2 text-sm text-kurio-sand">
                    Tente ajustar a busca ou os filtros para encontrar o que procura.
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-6 h-[35px] rounded-[4px] border border-kurio-orange px-4 font-semibold text-kurio-orange-light transition-colors hover:bg-kurio-orange hover:text-kurio-bg"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <ul
                    aria-busy={isFetching}
                    className={cn(
                      // No mobile a coluna da direita fica desencontrada (layout em "masonry")
                      'grid grid-cols-2 gap-x-4 gap-y-5 pb-[30px] transition-opacity max-md:[&>li:nth-child(even)]:translate-y-[30px] md:grid-cols-3 md:gap-x-[34px] md:gap-y-16 md:pb-0',
                      isFetching && 'opacity-60',
                    )}
                  >
                    {nftsData?.data.map((nft, index) => (
                      <li key={nft.id}>
                        {/* Primeira linha do catálogo: visível sem rolar no mobile e no desktop */}
                        <NFTCard nft={nft} priority={index < 3} />
                      </li>
                    ))}
                  </ul>

                  <Pagination
                    className="mt-16 flex justify-center md:mt-20 md:justify-end"
                    currentPage={currentPage}
                    totalPages={nftsData?.totalPages ?? 1}
                    onPageChange={changePage}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        </Sheet>
      </section>

      {/* Promo banners */}
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <PromoSection />
      </div>

      {/* Blog */}
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <BlogSection />
      </div>
    </>
  )
}

function MobileSearchBar({
  query,
  onSearch,
  activeFilterCount,
  onOpenFilters,
}: {
  query?: string
  onSearch: (q: string | undefined) => void
  activeFilterCount: number
  onOpenFilters: () => void
}) {
  const [term, setTerm] = React.useState(query ?? '')
  React.useEffect(() => setTerm(query ?? ''), [query])

  return (
    <div className="flex gap-2 font-mono">
      <form
        role="search"
        className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg bg-kurio-surface px-3 focus-within:outline-2 focus-within:outline-kurio-orange"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(term.trim() || undefined)
          ;(document.activeElement as HTMLElement | null)?.blur()
        }}
      >
        <SearchIcon size={18} className="shrink-0 text-kurio-sand" />
        <label htmlFor="mobile-search" className="sr-only">
          Explorar coleções
        </label>
        <input
          id="mobile-search"
          type="search"
          enterKeyHint="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Explorar coleções"
          maxLength={80}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-kurio-cream outline-none placeholder:text-kurio-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {term && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              setTerm('')
              if (query) onSearch(undefined)
            }}
            className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-kurio-sand"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </form>

      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={
          activeFilterCount > 0 ? `Filtros e ordenação, ${activeFilterCount} ativos` : 'Filtros e ordenação'
        }
        className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#c98547] to-[#9a6438] text-kurio-bg"
      >
        <Settings2 size={20} strokeWidth={2.2} aria-hidden />
        {activeFilterCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border-2 border-kurio-bg bg-kurio-cream text-[10px] font-bold text-kurio-bg"
          >
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  )
}
