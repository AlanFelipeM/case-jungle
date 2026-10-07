import React from 'react'
import type { NFT } from '@/types'
import { useCollectionNFTs } from '@/hooks/useNFTs'
import { NftCarousel } from './NftCarousel'

const MAX_ITEMS = 15

export function MoreFromCollection({ nft }: { nft: NFT }) {
  const { data, isLoading, isError } = useCollectionNFTs(nft.collectionId)
  const items = React.useMemo(
    () => (data ?? []).filter((item) => item.id !== nft.id).slice(0, MAX_ITEMS),
    [data, nft.id],
  )
  if (isError) return null
  return <NftCarousel title="Mais desta coleção" items={items} isLoading={isLoading} resetKey={nft.id} />
}
