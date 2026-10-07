import React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { SlidersHorizontal, X } from 'lucide-react'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CatalogFilters, CatalogTabs } from '@/components/home/CatalogFilters'
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
      {/* Hero */}
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 pt-8 pb-12">
        <HeroBanner />
      </div>

      {/* Catalog section */}
      <section
        ref={catalogRef}
        id="catalogo"
        aria-labelledby="catalog-heading"
        className="mx-auto mt-10 max-w-[1440px] scroll-mt-20 px-4 md:px-6"
      >
        <h2 id="catalog-heading" className="sr-only">
          Catálogo de NFTs
        </h2>
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
                <Sheet>
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
                  <SheetContent title="Filtros" className="bg-kurio-surface">
                    {filters}
                  </SheetContent>
                </Sheet>
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

            <div className="mt-[22px]">
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
                      'grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity md:grid-cols-3 md:gap-x-[34px] md:gap-y-16',
                      isFetching && 'opacity-60',
                    )}
                  >
                    {nftsData?.data.map((nft) => (
                      <li key={nft.id}>
                        <NFTCard nft={nft} />
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
