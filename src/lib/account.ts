import type { AccountProfile, Network, WalletConnector, WalletInput } from '@/types'
import { ENS_NAME_PATTERN, isValidAddress } from '@/lib/checkout'

/** Regras compartilhadas pelos formulários e pela API (mocks) */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/

export type ProfileForm = Omit<AccountProfile, 'avatar'>
export type ProfileErrors = Partial<Record<keyof ProfileForm, string>>

export function validateProfile(p: ProfileForm): ProfileErrors {
  const errors: ProfileErrors = {}
  if (!p.displayName?.trim()) errors.displayName = 'Informe o nome de exibição.'
  else if (p.displayName.trim().length > 40) errors.displayName = 'Use no máximo 40 caracteres.'
  if (!p.username?.trim()) errors.username = 'Informe o nome de usuário.'
  else if (!USERNAME_PATTERN.test(p.username)) errors.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.'
  if (!p.email?.trim()) errors.email = 'Informe o e-mail.'
  else if (!EMAIL_PATTERN.test(p.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!p.ensName?.trim()) errors.ensName = 'Informe o nome ENS.'
  else if (!ENS_NAME_PATTERN.test(p.ensName)) errors.ensName = 'Use de 3 a 32 caracteres: letras minúsculas, números, hífen ou ponto.'
  if (!p.profileName?.trim()) errors.profileName = 'Informe o apelido da carteira.'
  return errors
}

export interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
export type PasswordErrors = Partial<Record<keyof PasswordForm, string>>

export function passwordRuleError(password: string) {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return 'A senha precisa ter no mínimo 8 caracteres, com letras e números.'
  return undefined
}

/** A troca de senha só é validada quando algum campo de senha foi preenchido */
export function validatePassword(p: PasswordForm): PasswordErrors {
  const errors: PasswordErrors = {}
  if (!p.currentPassword && !p.newPassword && !p.confirmPassword) return errors
  if (!p.currentPassword) errors.currentPassword = 'Informe a senha atual.'
  if (!p.newPassword) errors.newPassword = 'Informe a nova senha.'
  else if (passwordRuleError(p.newPassword)) errors.newPassword = passwordRuleError(p.newPassword)
  else if (p.newPassword === p.currentPassword) errors.newPassword = 'A nova senha deve ser diferente da atual.'
  if (!p.confirmPassword) errors.confirmPassword = 'Confirme a nova senha.'
  else if (p.confirmPassword !== p.newPassword) errors.confirmPassword = 'As senhas não conferem.'
  return errors
}

export type WalletForm = Omit<WalletInput, 'network' | 'connector' | 'ens' | 'referralCode'> & {
  network: Network | ''
  connector: WalletConnector | ''
  ens: string
  referralCode: string
}
export type WalletErrors = Partial<Record<keyof WalletForm, string>>

export function validateWallet(w: WalletForm): WalletErrors {
  const errors: WalletErrors = {}
  if (!w.ownerName?.trim()) errors.ownerName = 'Informe o nome de exibição.'
  if (!w.label?.trim()) errors.label = 'Informe o apelido da carteira.'
  else if (w.label.trim().length > 24) errors.label = 'Use no máximo 24 caracteres.'
  if (!w.network) errors.network = 'Selecione uma rede.'
  if (!w.profileName?.trim()) errors.profileName = 'Informe o nome do perfil.'
  if (!w.address?.trim()) errors.address = 'Informe o endereço da carteira.'
  else if (w.network && !isValidAddress(w.address, w.network))
    errors.address = w.network === 'solana' ? 'Endereço Solana inválido.' : 'O endereço deve começar com 0x e ter 42 caracteres.'
  if (w.ens && !/^(0x[a-fA-F0-9]{40}|[a-z0-9-]+(\.[a-z0-9-]+)*\.eth)$/.test(w.ens.trim()))
    errors.ens = 'Informe um nome .eth ou um endereço 0x válido.'
  if (!w.connector) errors.connector = 'Selecione o tipo de carteira.'
  if (w.referralCode && !/^[A-Za-z0-9]{4,12}$/.test(w.referralCode)) errors.referralCode = 'O código deve ter de 4 a 12 letras ou números.'
  if (!w.email?.trim()) errors.email = 'Informe o e-mail.'
  else if (!EMAIL_PATTERN.test(w.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!w.ensName?.trim()) errors.ensName = 'Informe o nome ENS.'
  else if (!ENS_NAME_PATTERN.test(w.ensName)) errors.ensName = 'Use de 3 a 32 caracteres: letras minúsculas, números, hífen ou ponto.'
  return errors
}

/** Avatar: formatos e tamanho aceitos */
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
