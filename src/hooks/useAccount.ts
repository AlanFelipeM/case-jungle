import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getToken } from '@/lib/session'
import type { AccountProfile, NFT, PasswordChange, User, Wallet, WalletInput, WalletSlot } from '@/types'
import type { ProfileForm } from '@/lib/account'
import { authKeys, useSession } from '@/hooks/useAuth'
import { checkoutKeys } from '@/hooks/useCheckout'
import { favoriteKeys } from '@/hooks/useFavorites'

export function useAccountProfile() {
  return useQuery({
    queryKey: checkoutKeys.profile,
    queryFn: async ({ signal }) => (await api.get<AccountProfile>('/profile', { signal })).data,
    staleTime: 5 * 60_000,
  })
}

/** Navbar e menu da conta refletem o novo nome/avatar na hora */
function syncSessionUser(queryClient: QueryClient, user: User) {
  queryClient.setQueryData(authKeys.session(getToken()), user)
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProfileForm) =>
      (await api.patch<{ profile: AccountProfile; user: User }>('/profile', input)).data,
    onSuccess: ({ profile, user }) => {
      queryClient.setQueryData(checkoutKeys.profile, profile)
      syncSessionUser(queryClient, user)
    },
  })
}

export function useAvatar() {
  const queryClient = useQueryClient()
  const onSuccess = (user: User) => {
    syncSessionUser(queryClient, user)
    queryClient.setQueryData<AccountProfile>(checkoutKeys.profile, (p) => (p ? { ...p, avatar: user.avatar } : p))
  }
  return {
    upload: useMutation({
      mutationFn: async (image: string) => (await api.put<User>('/profile/avatar', { image })).data,
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async () => (await api.delete<User>('/profile/avatar')).data,
      onSuccess,
    }),
  }
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: PasswordChange) => {
      await api.post('/profile/password', input)
    },
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ slot, input }: { slot: WalletSlot; input: WalletInput | { sameAsPrimary: true } }) =>
      (await api.put<Wallet[]>(`/wallets/${slot}`, input)).data,
    onSuccess: (wallets) => queryClient.setQueryData(checkoutKeys.wallets, wallets),
  })
}

export function useRemoveSecondaryWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.delete<Wallet[]>('/wallets/secondary')).data,
    onSuccess: (wallets) => queryClient.setQueryData(checkoutKeys.wallets, wallets),
  })
}

/** NFTs da lista de interesse (favoritos) */
export function useFavoriteNFTs() {
  const { isAuthenticated } = useSession()
  return useQuery({
    queryKey: [...favoriteKeys.all, 'nfts'],
    queryFn: async ({ signal }) => (await api.get<NFT[]>('/favorites/nfts', { signal })).data,
    enabled: isAuthenticated,
  })
}
