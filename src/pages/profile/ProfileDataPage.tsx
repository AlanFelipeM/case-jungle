import React from 'react'
import { isAxiosError } from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { GalleryIcon } from '@/components/icons'
import { useAccountProfile, useAvatar, useChangePassword, useUpdateProfile } from '@/hooks/useAccount'
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  validatePassword,
  validateProfile,
  type PasswordErrors,
  type PasswordForm,
  type ProfileErrors,
  type ProfileForm,
} from '@/lib/account'
import { getErrorMessage } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { Field, TextInput } from '@/components/checkout/fields'
import { SectionTitle } from './ProfileLayout'

const EMPTY_PASSWORD: PasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' }
const PROFILE_ORDER: (keyof ProfileForm)[] = ['displayName', 'username', 'email', 'ensName', 'profileName']
const PASSWORD_ORDER: (keyof PasswordForm)[] = ['currentPassword', 'newPassword', 'confirmPassword']

/** Redimensiona para 256×256 (recorte central) antes de enviar */
async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const side = Math.min(bitmap.width, bitmap.height)
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function ProfileDataPage() {
  const { data: profile, isLoading, isError, refetch } = useAccountProfile()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const avatar = useAvatar()

  const [form, setForm] = React.useState<ProfileForm | null>(null)
  const [password, setPassword] = React.useState<PasswordForm>(EMPTY_PASSWORD)
  const [errors, setErrors] = React.useState<ProfileErrors & PasswordErrors>({})
  const [avatarError, setAvatarError] = React.useState<string | null>(null)
  const refs = React.useRef<Partial<Record<string, HTMLElement | null>>>({})
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (profile && !form) {
      const { avatar: _avatar, ...rest } = profile
      setForm(rest)
    }
  }, [profile, form])

  if (isLoading || (!form && !isError)) return <FormSkeleton />
  if (isError || !form || !profile) {
    return (
      <div role="alert" className="text-sm">
        Não foi possível carregar o perfil.{' '}
        <button type="button" onClick={() => refetch()} className="font-semibold text-kurio-orange-light underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  const ref = (field: string) => (el: HTMLElement | null) => {
    refs.current[field] = el
  }

  function update<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((f) => (f ? { ...f, [field]: value } : f))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function updatePassword(field: keyof PasswordForm, value: string) {
    setPassword((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function focusFirst(errs: ProfileErrors & PasswordErrors) {
    const first = [...PROFILE_ORDER, ...PASSWORD_ORDER].find((f) => errs[f])
    if (first) refs.current[first]?.focus()
  }

  async function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    if (!form || !profile) return
    const errs = { ...validateProfile(form), ...validatePassword(password) }
    setErrors(errs)
    if (Object.keys(errs).length) return focusFirst(errs)

    const { avatar: _avatar, ...saved } = profile
    const profileChanged = JSON.stringify(saved) !== JSON.stringify(form)
    const passwordChanged = !!password.newPassword
    if (!profileChanged && !passwordChanged) return toast('Nenhuma alteração para salvar.')

    try {
      if (profileChanged) await updateProfile.mutateAsync(form)
      if (passwordChanged) {
        await changePassword.mutateAsync({ currentPassword: password.currentPassword, newPassword: password.newPassword })
        setPassword(EMPTY_PASSWORD)
      }
      toast(passwordChanged && profileChanged ? 'Perfil e senha atualizados.' : passwordChanged ? 'Senha alterada.' : 'Perfil atualizado.', 'success')
    } catch (error) {
      const fieldErrors = isAxiosError<{ fieldErrors?: ProfileErrors & PasswordErrors }>(error)
        ? error.response?.data?.fieldErrors
        : undefined
      if (fieldErrors) {
        setErrors(fieldErrors)
        focusFirst(fieldErrors)
      } else {
        toast(getErrorMessage(error, 'Não foi possível salvar as alterações.'), 'error')
      }
    }
  }

  async function onAvatarSelected(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setAvatarError(null)
    if (!AVATAR_TYPES.includes(file.type)) return setAvatarError('Use uma imagem PNG, JPG ou WebP.')
    if (file.size > AVATAR_MAX_BYTES) return setAvatarError('A imagem deve ter até 2 MB.')
    try {
      await avatar.upload.mutateAsync(await resizeImage(file))
      toast('Avatar atualizado.', 'success')
    } catch (error) {
      setAvatarError(getErrorMessage(error, 'Não foi possível enviar a imagem.'))
    }
  }

  const saving = updateProfile.isPending || changePassword.isPending

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="profile-title">
      <SectionTitle id="profile-title">Perfil do colecionador</SectionTitle>

      <div className="mt-8 grid gap-x-7 gap-y-[22px] md:grid-cols-2">
        <Field id="displayName" label="Nome de exibição" required error={errors.displayName}>
          {(a) => <TextInput {...a} ref={ref('displayName')} autoComplete="name" value={form.displayName} onChange={(e) => update('displayName', e.target.value)} />}
        </Field>
        <Field id="username" label="Nome de usuário" required error={errors.username}>
          {(a) => (
            <TextInput {...a} ref={ref('username')} autoComplete="username" autoCapitalize="none" value={form.username} onChange={(e) => update('username', e.target.value.toLowerCase())} />
          )}
        </Field>
        <Field id="email" label="E-mail" required error={errors.email}>
          {(a) => <TextInput {...a} ref={ref('email')} type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />}
        </Field>
        <Field id="ensName" label="Nome ENS" required error={errors.ensName}>
          {(a) => (
            <div className="flex gap-2.5">
              <span aria-hidden className="grid h-10 w-[78px] shrink-0 place-items-center border border-[#3f2319] text-sm">
                .eth
              </span>
              <TextInput {...a} ref={ref('ensName')} autoCapitalize="none" spellCheck={false} value={form.ensName} onChange={(e) => update('ensName', e.target.value.toLowerCase())} />
            </div>
          )}
        </Field>
        <Field id="profileName" label="Apelido da carteira" required error={errors.profileName}>
          {(a) => <TextInput {...a} ref={ref('profileName')} value={form.profileName} onChange={(e) => update('profileName', e.target.value)} />}
        </Field>

        {/* Avatar */}
        <div>
          <p id="avatar-label" className="mb-2 text-[15px] leading-5">
            Avatar
          </p>
          <div className="flex items-center gap-6" role="group" aria-labelledby="avatar-label">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Seu avatar" width={50} height={50} className="size-[50px] rounded-full object-cover" />
            ) : (
              <span className="grid size-[50px] place-items-center rounded-full bg-[#2f1d15] text-kurio-orange-light" aria-label="Sem avatar" role="img">
                <GalleryIcon size={24} />
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={AVATAR_TYPES.join(',')}
              className="sr-only"
              id="avatar-input"
              onChange={(e) => onAvatarSelected(e.target.files?.[0])}
              aria-describedby={avatarError ? 'avatar-error' : undefined}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatar.upload.isPending}
              className="h-10 rounded-[4px] bg-kurio-orange px-6 text-sm font-semibold text-kurio-bg transition-colors hover:bg-kurio-orange-hover disabled:opacity-60"
            >
              {avatar.upload.isPending ? 'Enviando…' : 'Alterar'}
            </button>
            <button
              type="button"
              onClick={() =>
                avatar.remove.mutate(undefined, {
                  onSuccess: () => toast('Avatar removido.'),
                  onError: (error) => setAvatarError(getErrorMessage(error)),
                })
              }
              // Sem avatar não há o que remover
              disabled={!profile.avatar || avatar.remove.isPending}
              className="text-sm transition-colors hover:text-kurio-orange-light disabled:opacity-50 disabled:hover:text-kurio-cream"
            >
              Remover
            </button>
          </div>
          {avatarError && (
            <p id="avatar-error" role="alert" className="mt-2 text-xs text-[#f4a28c]">
              {avatarError}
            </p>
          )}
        </div>
      </div>

      {/* Alterar senha */}
      <fieldset className="mt-10 md:max-w-[calc(50%-14px)]">
        <legend className="text-[15px] leading-6 font-bold md:text-base">Alterar senha</legend>
        <p className="mt-1 text-xs text-kurio-sand">Preencha apenas se quiser trocar a senha.</p>
        <div className="mt-4 space-y-[18px]">
          <PasswordField id="currentPassword" label="Senha atual" autoComplete="current-password" value={password.currentPassword} error={errors.currentPassword} onChange={(v) => updatePassword('currentPassword', v)} inputRef={ref('currentPassword')} />
          <PasswordField id="newPassword" label="Nova senha" autoComplete="new-password" value={password.newPassword} error={errors.newPassword} onChange={(v) => updatePassword('newPassword', v)} inputRef={ref('newPassword')} hint="Mínimo de 8 caracteres, com letras e números." />
          <PasswordField id="confirmPassword" label="Confirmar nova senha" autoComplete="new-password" value={password.confirmPassword} error={errors.confirmPassword} onChange={(v) => updatePassword('confirmPassword', v)} inputRef={ref('confirmPassword')} />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="mt-8 h-10 w-full rounded-[4px] bg-kurio-orange px-10 text-sm font-semibold text-kurio-bg transition-colors hover:bg-kurio-orange-hover disabled:opacity-60 md:w-auto"
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}

function PasswordField({
  id,
  label,
  value,
  error,
  hint,
  autoComplete,
  onChange,
  inputRef,
}: {
  id: string
  label: string
  value: string
  error?: string
  hint?: string
  autoComplete: string
  onChange: (value: string) => void
  inputRef: (el: HTMLElement | null) => void
}) {
  const [visible, setVisible] = React.useState(false)
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      {(a) => (
        <div className="relative">
          <TextInput {...a} ref={inputRef} type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="pr-12" />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            aria-pressed={visible}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded text-kurio-muted hover:text-kurio-orange-light"
          >
            {visible ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  )
}

function FormSkeleton() {
  return (
    <div role="status" aria-label="Carregando perfil..." className="space-y-6">
      <Skeleton className="h-6 w-56" />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full" />
        ))}
      </div>
    </div>
  )
}
