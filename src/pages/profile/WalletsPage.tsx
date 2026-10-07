import React from 'react'
import { isAxiosError } from 'axios'
import type { AccountProfile, Wallet, WalletConnector, WalletSlot } from '@/types'
import { useAccountProfile, useRemoveSecondaryWallet, useSaveWallet } from '@/hooks/useAccount'
import { useWallets } from '@/hooks/useCheckout'
import { validateWallet, type WalletErrors, type WalletForm } from '@/lib/account'
import { CONNECTOR_LABELS, NETWORK_LABELS } from '@/lib/checkout'
import { getErrorMessage } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { Field, SelectInput, TextInput } from '@/components/checkout/fields'
import { SectionTitle } from './ProfileLayout'

const ORDER: (keyof WalletForm)[] = ['ownerName', 'label', 'network', 'profileName', 'address', 'ens', 'connector', 'referralCode', 'email', 'ensName']
const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

function toForm(wallet: Wallet | undefined, profile: AccountProfile | undefined): WalletForm {
  return {
    ownerName: wallet?.ownerName ?? profile?.displayName ?? '',
    label: wallet?.label ?? '',
    network: wallet?.network ?? '',
    profileName: wallet?.profileName ?? profile?.profileName ?? '',
    address: wallet?.address ?? '',
    ens: wallet?.ens ?? '',
    connector: wallet?.connector ?? '',
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? profile?.email ?? '',
    ensName: wallet?.ensName ?? profile?.ensName ?? '',
  }
}

export function WalletsPage() {
  const { data: wallets, isLoading, isError, refetch } = useWallets()
  const { data: profile, isLoading: profileLoading } = useAccountProfile()
  const save = useSaveWallet()
  const removeSecondary = useRemoveSecondaryWallet()
  const [secondaryOpen, setSecondaryOpen] = React.useState(false)

  if (isLoading || profileLoading) return <WalletsSkeleton />
  if (isError || !wallets) {
    return (
      <div role="alert" className="text-sm">
        Não foi possível carregar as carteiras.{' '}
        <button type="button" onClick={() => refetch()} className="font-semibold text-kurio-orange-light underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  const primary = wallets.find((w) => w.isPrimary)
  const secondary = wallets.find((w) => !w.isPrimary)
  const same = !!secondary?.sameAsPrimary

  function toggleSameAsPrimary(checked: boolean) {
    if (checked) {
      save.mutate(
        { slot: 'secondary', input: { sameAsPrimary: true } },
        {
          onSuccess: () => {
            setSecondaryOpen(false)
            toast('A carteira secundária agora é igual à principal.', 'success')
          },
          onError: (error) => toast(getErrorMessage(error), 'error'),
        },
      )
    } else {
      removeSecondary.mutate(undefined, { onSuccess: () => toast('Carteira secundária removida.') })
    }
  }

  return (
    <div className="space-y-12">
      <section aria-labelledby="primary-title">
        <SectionTitle
          id="primary-title"
          action={!primary && <span className="text-[15px] font-bold text-kurio-orange-light">Adicionar</span>}
        >
          Carteira principal
        </SectionTitle>
        <p className="mt-1 text-[13px] leading-5 text-kurio-sand">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
        </p>
        <WalletEditor
          key={primary?.id ?? 'new-primary'}
          slot="primary"
          wallet={primary}
          profile={profile}
          submitLabel="Salvar carteira"
        />
      </section>

      <section aria-labelledby="secondary-title">
        <SectionTitle
          id="secondary-title"
          action={
            <div className="flex items-center gap-4 text-[13px]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={same}
                  disabled={!primary || save.isPending || removeSecondary.isPending}
                  onChange={(e) => toggleSameAsPrimary(e.target.checked)}
                  className="size-4 appearance-none rounded-full border-2 border-kurio-orange bg-clip-content p-[2px] checked:bg-kurio-orange disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kurio-orange"
                />
                Igual à carteira principal
              </label>
              {!secondary && !secondaryOpen && (
                <button
                  type="button"
                  onClick={() => setSecondaryOpen(true)}
                  disabled={!primary}
                  className="text-[15px] font-bold text-kurio-orange-light hover:text-kurio-cream disabled:opacity-40"
                >
                  Adicionar
                </button>
              )}
            </div>
          }
        >
          Carteira secundária
        </SectionTitle>

        {!primary ? (
          <p className="mt-2 text-[13px] text-kurio-sand">Cadastre a carteira principal para adicionar uma secundária.</p>
        ) : same ? (
          <p className="mt-2 text-[13px] text-kurio-sand">
            Usando a mesma carteira da principal: {primary.label} · {primary.ens ?? shortAddress(primary.address)}.
          </p>
        ) : secondary && !secondaryOpen ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-kurio-surface p-4 text-sm">
            <div>
              <p className="font-bold">{secondary.label}</p>
              <p className="text-kurio-sand">
                {secondary.ens ?? shortAddress(secondary.address)} · {NETWORK_LABELS[secondary.network]} · {CONNECTOR_LABELS[secondary.connector]}
              </p>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setSecondaryOpen(true)} className="font-bold text-kurio-orange-light hover:text-kurio-cream">
                Editar
              </button>
              <button
                type="button"
                onClick={() => removeSecondary.mutate(undefined, { onSuccess: () => toast('Carteira secundária removida.') })}
                disabled={removeSecondary.isPending}
                className="hover:text-kurio-orange-light"
              >
                Remover
              </button>
            </div>
          </div>
        ) : secondaryOpen ? (
          <WalletEditor
            slot="secondary"
            wallet={secondary}
            profile={profile}
            submitLabel="Salvar carteira"
            onDone={() => setSecondaryOpen(false)}
            onCancel={() => setSecondaryOpen(false)}
          />
        ) : (
          <p className="mt-2 text-[13px] text-kurio-sand">Você ainda não adicionou uma carteira secundária.</p>
        )}
      </section>
    </div>
  )
}

function WalletEditor({
  slot,
  wallet,
  profile,
  submitLabel,
  onDone,
  onCancel,
}: {
  slot: WalletSlot
  wallet: Wallet | undefined
  profile: AccountProfile | undefined
  submitLabel: string
  onDone?: () => void
  onCancel?: () => void
}) {
  const save = useSaveWallet()
  const [form, setForm] = React.useState<WalletForm>(() => toForm(wallet, profile))
  const [errors, setErrors] = React.useState<WalletErrors>({})
  const refs = React.useRef<Partial<Record<keyof WalletForm, HTMLElement | null>>>({})
  const prefix = `${slot}-wallet`

  function update<K extends keyof WalletForm>(field: K, value: WalletForm[K]) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function focusFirst(errs: WalletErrors) {
    const first = ORDER.find((f) => errs[f])
    if (first) refs.current[first]?.focus()
  }

  async function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    const errs = validateWallet(form)
    setErrors(errs)
    if (Object.keys(errs).length) return focusFirst(errs)
    try {
      await save.mutateAsync({
        slot,
        input: {
          ...form,
          network: form.network as Wallet['network'],
          connector: form.connector as WalletConnector,
          ens: form.ens || undefined,
          referralCode: form.referralCode || undefined,
        },
      })
      toast(slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.', 'success')
      onDone?.()
    } catch (error) {
      const fieldErrors = isAxiosError<{ fieldErrors?: WalletErrors }>(error) ? error.response?.data?.fieldErrors : undefined
      if (fieldErrors) {
        setErrors(fieldErrors)
        focusFirst(fieldErrors)
      } else {
        toast(getErrorMessage(error, 'Não foi possível salvar a carteira.'), 'error')
      }
    }
  }

  const ref = (field: keyof WalletForm) => (el: HTMLElement | null) => {
    refs.current[field] = el
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5">
      <div className="grid gap-x-7 gap-y-[18px] md:grid-cols-2">
        <Field id={`${prefix}-ownerName`} label="Nome de exibição" required error={errors.ownerName}>
          {(a) => <TextInput {...a} ref={ref('ownerName')} value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} />}
        </Field>
        <Field id={`${prefix}-label`} label="Apelido da carteira" required error={errors.label}>
          {(a) => <TextInput {...a} ref={ref('label')} placeholder="Ex.: Principal, Reserva" value={form.label} onChange={(e) => update('label', e.target.value)} />}
        </Field>
        <Field id={`${prefix}-network`} label="Rede" required error={errors.network}>
          {(a) => (
            <SelectInput {...a} ref={ref('network')} value={form.network} onChange={(e) => update('network', e.target.value as WalletForm['network'])}>
              <option value="" disabled>
                Selecione uma rede
              </option>
              {Object.entries(NETWORK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field id={`${prefix}-profileName`} label="Nome do perfil" required error={errors.profileName}>
          {(a) => <TextInput {...a} ref={ref('profileName')} value={form.profileName} onChange={(e) => update('profileName', e.target.value)} />}
        </Field>
        <Field id={`${prefix}-address`} label="Endereço da carteira" required error={errors.address}>
          {(a) => (
            <TextInput {...a} ref={ref('address')} placeholder="Endereço 0x da carteira" autoCapitalize="none" spellCheck={false} value={form.address} onChange={(e) => update('address', e.target.value)} />
          )}
        </Field>
        <Field id={`${prefix}-ens`} label="ENS ou carteira secundária" optional hiddenLabel error={errors.ens} className="md:self-end">
          {(a) => (
            <TextInput {...a} ref={ref('ens')} placeholder="ENS ou carteira secundária (opcional)" autoCapitalize="none" spellCheck={false} value={form.ens} onChange={(e) => update('ens', e.target.value)} />
          )}
        </Field>
        <Field id={`${prefix}-connector`} label="Tipo de carteira" required error={errors.connector}>
          {(a) => (
            <SelectInput {...a} ref={ref('connector')} value={form.connector} onChange={(e) => update('connector', e.target.value as WalletForm['connector'])}>
              <option value="" disabled>
                Selecione uma carteira
              </option>
              {Object.entries(CONNECTOR_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field id={`${prefix}-referralCode`} label="Código de indicação" optional error={errors.referralCode}>
          {(a) => <TextInput {...a} ref={ref('referralCode')} autoCapitalize="characters" value={form.referralCode} onChange={(e) => update('referralCode', e.target.value.toUpperCase())} />}
        </Field>
        <Field id={`${prefix}-email`} label="E-mail" required error={errors.email}>
          {(a) => <TextInput {...a} ref={ref('email')} type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />}
        </Field>
        <Field id={`${prefix}-ensName`} label="Nome ENS" required error={errors.ensName}>
          {(a) => (
            <div className="flex gap-2.5">
              <span aria-hidden className="grid h-10 w-[78px] shrink-0 place-items-center border border-[#3f2319] text-sm">
                .eth
              </span>
              <TextInput {...a} ref={ref('ensName')} autoCapitalize="none" spellCheck={false} value={form.ensName} onChange={(e) => update('ensName', e.target.value.toLowerCase())} />
            </div>
          )}
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={save.isPending}
          className="h-10 w-full rounded-[4px] bg-kurio-orange px-6 text-sm font-semibold text-kurio-bg transition-colors hover:bg-kurio-orange-hover disabled:opacity-60 md:w-auto"
        >
          {save.isPending ? 'Salvando…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm hover:text-kurio-orange-light">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

function WalletsSkeleton() {
  return (
    <div role="status" aria-label="Carregando carteiras..." className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full" />
        ))}
      </div>
    </div>
  )
}
