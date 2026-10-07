import React from 'react'
import { cn } from '@/lib/utils'
import type { NFTCategory, NFTTab, NFTSortOption } from '@/types'
import { useMeta } from '@/hooks/useNFTs'
import { Skeleton } from '@/components/ui/Skeleton'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRICE_BOUNDS } from '@/lib/catalogSearch'


const CATEGORY_LABELS: Record<NFTCategory, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  coleccionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

const NETWORK_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

const SORT_OPTIONS: { value: NFTSortOption; label: string }[] = [
  { value: 'recently-listed', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'newest', label: 'Mais novos' },
  { value: 'popular', label: 'Mais populares' },
]

const TABS: { value: NFTTab; label: string }[] = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

const formatPrice = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Filtros ───────────────────────────────────────────────────────────────

interface CatalogFiltersProps {
  selectedCategory: NFTCategory | undefined
  onCategoryChange: (cat: NFTCategory | undefined) => void
  priceRange: [number, number]
  onPriceChange: (range: [number, number]) => void
  selectedNetwork: string | undefined
  onNetworkChange: (net: string | undefined) => void
  className?: string
}

export function CatalogFilters({
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceChange,
  selectedNetwork,
  onNetworkChange,
  className,
}: CatalogFiltersProps) {
  const { data: meta, isLoading: metaLoading } = useMeta()
  const id = React.useId()

  // A faixa só é aplicada ao clicar em "Aplicar"
  const [draftPrice, setDraftPrice] = React.useState(priceRange)
  React.useEffect(() => setDraftPrice(priceRange), [priceRange])
  const priceChanged = draftPrice[0] !== priceRange[0] || draftPrice[1] !== priceRange[1]

  const categories = Object.entries(CATEGORY_LABELS) as [NFTCategory, string][]
  const networks = Object.entries(meta?.networks ?? {})

  return (
    <div className={cn('bg-kurio-surface px-5 pt-4 pb-5 font-mono text-kurio-cream', className)}>
      <FilterSection id={`${id}-collections`} title="Coleções">
        {metaLoading ? (
          <ListSkeleton rows={9} />
        ) : (
          <ul>
            {categories.map(([value, label]) => (
              <li key={value}>
                <FilterOption
                  label={label}
                  count={meta?.categories[value] ?? 0}
                  active={selectedCategory === value}
                  strongCount
                  onClick={() => onCategoryChange(selectedCategory === value ? undefined : value)}
                />
              </li>
            ))}
          </ul>
        )}
      </FilterSection>

      <FilterSection id={`${id}-price`} title="Faixa de preço" className="mt-8">
        <div className="mt-3.5 pl-3">
          <Slider
            min={PRICE_BOUNDS[0]}
            max={PRICE_BOUNDS[1]}
            step={0.01}
            minStepsBetweenThumbs={1}
            value={draftPrice}
            onValueChange={(value) => setDraftPrice([value[0], value[1]])}
            thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
          />
        </div>
        <p className="mt-[22px] pl-3 text-sm leading-5" aria-live="polite">
          Preço: {formatPrice(draftPrice[0])} - {formatPrice(draftPrice[1])} ETH
        </p>
        <button
          type="button"
          onClick={() => onPriceChange(draftPrice)}
          disabled={!priceChanged}
          className="mt-3 ml-3 h-[35px] rounded-[4px] bg-kurio-orange px-3 text-base font-semibold text-kurio-bg transition-colors hover:bg-kurio-orange-hover disabled:cursor-default disabled:hover:bg-kurio-orange"
        >
          Aplicar
        </button>
      </FilterSection>

      <FilterSection id={`${id}-network`} title="Rede" className="mt-9">
        {metaLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <ul>
            {networks.map(([net, count]) => (
              <li key={net}>
                <FilterOption
                  label={NETWORK_LABELS[net] ?? net}
                  count={count}
                  active={selectedNetwork === net}
                  onClick={() => onNetworkChange(selectedNetwork === net ? undefined : net)}
                />
              </li>
            ))}
          </ul>
        )}
      </FilterSection>
    </div>
  )
}

function FilterSection({
  id,
  title,
  className,
  children,
}: {
  id: string
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="mb-1.5 text-lg leading-7 font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function FilterOption({
  label,
  count,
  active,
  strongCount = false,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  strongCount?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-[4px] px-3 text-left text-[15px] transition-colors',
        active ? 'text-kurio-orange-light' : 'text-kurio-sand hover:text-kurio-cream',
      )}
    >
      <span>{label}</span>
      <span className={cn(strongCount && 'font-semibold')}>
        ({count})<span className="sr-only"> itens</span>
      </span>
    </button>
  )
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-5 px-3 py-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}

// ─── Abas + ordenação ──────────────────────────────────────────────────────

interface CatalogTabsProps {
  selectedTab: NFTTab
  onTabChange: (tab: NFTTab) => void
  sortBy: NFTSortOption
  onSortChange: (sort: NFTSortOption) => void
  /** Ação extra exibida antes da ordenação (ex.: botão de filtros no mobile) */
  action?: React.ReactNode
}

export function CatalogTabs({ selectedTab, onTabChange, sortBy, onSortChange, action }: CatalogTabsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 font-mono text-sm text-kurio-cream sm:text-[15px]">
      <div className="flex gap-4 overflow-x-auto sm:gap-[22px]" role="group" aria-label="Listagem">
        {TABS.map((tab) => {
          const active = selectedTab === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'relative shrink-0 pb-1 leading-6 whitespace-nowrap transition-colors',
                active ? 'text-kurio-orange-light' : 'hover:text-kurio-orange-light',
              )}
            >
              {tab.label}
              {active && (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-kurio-orange" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4">
        {action}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as NFTSortOption)}>
          <SelectTrigger aria-label="Ordenar por" className="pb-1 leading-6">
            <span aria-hidden className="hidden sm:inline">Ordenar por:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
