import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getErrorStatus } from '@/lib/apiError'
import type {
  NFT,
  NFTListParams,
  NFTListResponse,
  NFTReviewsResponse,
  FeaturedBanner,
  BlogPost,
} from '@/types'

// ─── Query Keys ────────────────────────────────────────────────────────────
export const nftKeys = {
  all: ['nfts'] as const,
  list: (params: NFTListParams) => ['nfts', 'list', params] as const,
  detail: (id: string) => ['nfts', 'detail', id] as const,
  reviews: (id: string) => ['nfts', 'detail', id, 'reviews'] as const,
  collection: (collectionId: string) => ['nfts', 'collection', collectionId] as const,
  featured: ['nfts', 'featured'] as const,
  banners: ['banners'] as const,
  blog: ['blog'] as const,
  meta: ['meta'] as const,
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useNFTs(params: NFTListParams) {
  return useQuery({
    queryKey: nftKeys.list(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string> = {}
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams[k] = String(v)
        }
      })
      const { data } = await api.get<NFTListResponse>('/nfts', { params: cleanParams, signal })
      return data
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useNFT(id: string) {
  return useQuery({
    queryKey: nftKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<NFT>(`/nfts/${id}`, { signal })
      return data
    },
    staleTime: 60_000,
    enabled: !!id,
    // NFT inexistente (404) não é falha transitória: não repete
    retry: (failureCount, error) => getErrorStatus(error) !== 404 && failureCount < 2,
  })
}

export function useNFTReviews(id: string, enabled = true) {
  return useQuery({
    queryKey: nftKeys.reviews(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<NFTReviewsResponse>(`/nfts/${id}/reviews`, { signal })
      return data
    },
    staleTime: 60_000,
    enabled: enabled && !!id,
  })
}

/** NFTs da mesma coleção (até 16), para o carrossel do detalhe */
export function useCollectionNFTs(collectionId: string | undefined) {
  return useQuery({
    queryKey: nftKeys.collection(collectionId ?? ''),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<NFTListResponse>('/nfts', {
        params: { collection: collectionId, limit: 16 },
        signal,
      })
      return data.data
    },
    staleTime: 60_000,
    enabled: !!collectionId,
  })
}

export function useFeaturedNFT() {
  return useQuery({
    queryKey: nftKeys.featured,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<NFT>('/nfts/featured', { signal })
      return data
    },
    staleTime: 60_000,
  })
}

export function useBanners() {
  return useQuery({
    queryKey: nftKeys.banners,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<FeaturedBanner[]>('/banners', { signal })
      return data
    },
    staleTime: 300_000,
  })
}

export function useBlogPosts() {
  return useQuery({
    queryKey: nftKeys.blog,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<BlogPost[]>('/blog', { signal })
      return data
    },
    staleTime: 300_000,
  })
}

export function useMeta() {
  return useQuery({
    queryKey: nftKeys.meta,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{
        categories: Record<string, number>
        networks: Record<string, number>
      }>('/meta', { signal })
      return data
    },
    staleTime: 300_000,
  })
}
