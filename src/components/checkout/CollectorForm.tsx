import type { Wallet, WalletConnector } from '@/types'
import {
  CONNECTOR_LABELS,
  NETWORK_LABELS,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutForm,
} from '@/lib/checkout'
import { cn } from '@/lib/utils'
import { Field, SelectInput, TextArea, TextInput } from './fields'

interface CollectorFormProps {
  form: CheckoutForm
  errors: CheckoutErrors
  wallets: Wallet[]
  onChange: <K extends CheckoutField>(field: K, value: CheckoutForm[K]) => void
  /** Registra os campos para focar o primeiro com erro */
  fieldRef: (field: CheckoutField) => (el: HTMLElement | null) => void
  compact?: boolean
}

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

export function CollectorForm({ form, errors, wallets, onChange, fieldRef, compact = false }: CollectorFormProps) {
  const selectedWallet = wallets.find((w) => w.id === form.walletId)
  const registered = !form.useOtherWallet
  const networkValue = registered ? (selectedWallet?.network ?? '') : form.network

  return (
    <div className={cn('grid gap-x-6 gap-y-[18px]', !compact && 'md:grid-cols-2')}>
      <Field id="displayName" label="Nome de exibição" required error={errors.displayName}>
        {(a) => (
          <TextInput {...a} ref={fieldRef('displayName')} autoComplete="name" value={form.displayName} onChange={(e) => onChange('displayName', e.target.value)} />
        )}
      </Field>
      <Field id="username" label="Nome de usuário" required error={errors.username}>
        {(a) => (
          <TextInput {...a} ref={fieldRef('username')} autoComplete="username" autoCapitalize="none" value={form.username} onChange={(e) => onChange('username', e.target.value.toLowerCase())} />
        )}
      </Field>

      <Field id="network" label="Rede" required error={errors.network} hint={registered ? 'Definida pela carteira cadastrada.' : undefined}>
        {(a) => (
          <SelectInput {...a} ref={fieldRef('network')} value={networkValue} disabled={registered} onChange={(e) => onChange('network', e.target.value as CheckoutForm['network'])}>
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
      <Field id="profileName" label="Nome do perfil" required error={errors.profileName}>
        {(a) => <TextInput {...a} ref={fieldRef('profileName')} value={form.profileName} onChange={(e) => onChange('profileName', e.target.value)} />}
      </Field>

      <Field id="walletAddress" label="Endereço da carteira" required error={errors.walletAddress}>
        {(a) =>
          registered ? (
            <SelectInput {...a} ref={fieldRef('walletAddress')} value={form.walletId} onChange={(e) => onChange('walletId', e.target.value)}>
              <option value="" disabled>
                Selecione uma carteira cadastrada
              </option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} · {w.ens ?? shortAddress(w.address)}
                </option>
              ))}
            </SelectInput>
          ) : (
            <TextInput {...a} ref={fieldRef('walletAddress')} placeholder="Endereço 0x da carteira" autoCapitalize="none" spellCheck={false} value={form.walletAddress} onChange={(e) => onChange('walletAddress', e.target.value)} />
          )
        }
      </Field>
      <Field id="secondary" label="ENS ou carteira secundária" optional hiddenLabel={!compact} error={errors.secondary} className={cn(!compact && 'md:self-end')}>
        {(a) => (
          <TextInput
            {...a}
            ref={fieldRef('secondary')}
            placeholder="ENS ou carteira secundária (opcional)"
            autoCapitalize="none"
            spellCheck={false}
            disabled={registered}
            value={registered ? (selectedWallet?.ens ?? '') : form.secondary}
            onChange={(e) => onChange('secondary', e.target.value)}
          />
        )}
      </Field>

      <Field id="connector" label="Tipo de carteira" required error={errors.connector}>
        {(a) => (
          <SelectInput {...a} ref={fieldRef('connector')} value={form.connector} onChange={(e) => onChange('connector', e.target.value as WalletConnector)}>
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
      <Field id="referralCode" label="Código de indicação" optional error={errors.referralCode}>
        {(a) => (
          <TextInput {...a} ref={fieldRef('referralCode')} autoCapitalize="characters" value={form.referralCode} onChange={(e) => onChange('referralCode', e.target.value.toUpperCase())} />
        )}
      </Field>

      <Field id="email" label="E-mail" required error={errors.email}>
        {(a) => <TextInput {...a} ref={fieldRef('email')} type="email" autoComplete="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} />}
      </Field>
      <Field id="ensName" label="Nome ENS" required error={errors.ensName}>
        {(a) => (
          <div className="flex">
            <TextInput {...a} ref={fieldRef('ensName')} autoCapitalize="none" spellCheck={false} className="border-r-0" value={form.ensName} onChange={(e) => onChange('ensName', e.target.value.toLowerCase())} />
            <span aria-hidden className="grid h-10 shrink-0 place-items-center border border-[#3f2319] px-3 text-sm">
              .eth
            </span>
          </div>
        )}
      </Field>

      <label className={cn('flex cursor-pointer items-center gap-2 text-[15px]', !compact && 'md:col-span-2')}>
        <input
          type="checkbox"
          checked={form.useOtherWallet}
          onChange={(e) => onChange('useOtherWallet', e.target.checked)}
          className="size-4 appearance-none rounded-full border-2 border-kurio-orange bg-clip-content p-[2px] checked:bg-kurio-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kurio-orange"
        />
        Usar outra carteira?
      </label>

      <Field id="note" label="Observação do colecionador" optional error={errors.note} className={cn(!compact && 'md:col-span-2 md:max-w-[350px]')}>
        {(a) => (
          <TextArea {...a} ref={fieldRef('note')} maxLength={280} value={form.note} onChange={(e) => onChange('note', e.target.value)} />
        )}
      </Field>
    </div>
  )
}
