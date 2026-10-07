import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  NFT,
  NFTListParams,
  NFTListResponse,
  FeaturedBanner,
  BlogPost,
} from '@/types'

// ─── Query Keys ────────────────────────────────────────────────────────────
export const nftKeys = {
  all: ['nfts'] as const,
  list: (params: NFTListParams) => ['nfts', 'list', params] as const,
  detail: (id: string) => ['nfts', 'detail', id] as const,
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
