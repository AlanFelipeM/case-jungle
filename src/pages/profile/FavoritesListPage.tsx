import { Link } from '@tanstack/react-router'
import { useFavoriteNFTs } from '@/hooks/useAccount'
import { useFavorites } from '@/hooks/useFavorites'
import { NFTCard } from '@/components/ui/NFTCard'
import { NFTCardSkeleton } from '@/components/ui/Skeleton'
import { SectionTitle } from './ProfileLayout'

/** Lista de interesse: NFTs favoritados pelo usuário */
export function FavoritesListPage() {
  const { data: nfts, isLoading, isError, refetch } = useFavoriteNFTs()
  // A lista acompanha o estado otimista dos corações
  const { data: favoriteIds } = useFavorites()
  const visible = (nfts ?? []).filter((nft) => !favoriteIds || favoriteIds.includes(nft.id))

  return (
    <section aria-labelledby="favorites-title">
      <SectionTitle id="favorites-title">Lista de interesse</SectionTitle>
      <p className="mt-1 text-[13px] text-kurio-sand">NFTs que você favoritou para acompanhar.</p>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3" role="status" aria-label="Carregando lista de interesse...">
          {Array.from({ length: 3 }).map((_, i) => (
            <NFTCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="mt-6 text-sm">
          Não foi possível carregar a lista.{' '}
          <button type="button" onClick={() => refetch()} className="font-semibold text-kurio-orange-light underline">
            Tentar novamente
          </button>
        </p>
      ) : visible.length === 0 ? (
        <div className="mt-6 bg-kurio-surface p-6 text-sm">
          <p>Você ainda não favoritou nenhum NFT.</p>
          <Link to="/" hash="catalogo" className="mt-2 inline-block font-semibold text-kurio-orange-light hover:underline">
            Explorar o catálogo
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-[26px]">
          {visible.map((nft) => (
            <li key={nft.id}>
              <NFTCard nft={nft} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
