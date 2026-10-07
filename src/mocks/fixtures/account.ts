import type { CollectorProfile, Wallet } from '@/types'

/** Colecionador de demonstração (substituído pela sessão quando o login existir) */
export const DEMO_PROFILE: CollectorProfile = {
  displayName: 'Nova Sato',
  username: 'nova.kurio',
  profileName: 'Nova',
  email: 'nova@kurio.app',
  ensName: 'nova.kurio',
}

export const DEMO_WALLETS: Wallet[] = [
  {
    id: 'wallet-reserva',
    label: 'Reserva',
    address: '0x5B7C2e1Fd04A6c3b9E8d2A7f61C0b3D4e9A1F2c7',
    ens: 'nova.kurio.eth',
    network: 'polygon',
    isPrimary: false,
    connector: 'coinbase',
  },
  {
    id: 'wallet-principal',
    label: 'Principal',
    address: '0xA91F3c7D2b4E6f8A0c1B3d5E7f9A2c4E6b8DE82C',
    network: 'ethereum',
    isPrimary: true,
    connector: 'metamask',
  },
]
