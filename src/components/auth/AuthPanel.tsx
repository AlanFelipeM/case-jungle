import React from 'react'
import { isAxiosError } from 'axios'
import { Eye, EyeOff, Info } from 'lucide-react'
import { useLogin, useRegister } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

export type AuthMode = 'login' | 'register'

interface AuthPanelProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSuccess: (user: User) => void
  variant: 'dialog' | 'page'
  /** Motivo exibido acima do formulário (ex.: sessão expirada) */
  notice?: string
  /** Título acessível do diálogo (Radix Dialog.Title) */
  TitleComponent?: React.ElementType
}

type Fields = { username: string; email: string; password: string; confirm: string }
type FieldErrors = Partial<Record<keyof Fields, string>>

const EMPTY: Fields = { username: '', email: '', password: '', confirm: '' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mesmas regras da API */
function validate(mode: AuthMode, f: Fields): FieldErrors {
  const errors: FieldErrors = {}
  if (!f.email.trim()) errors.email = 'Informe o e-mail.'
  else if (!EMAIL.test(f.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!f.password) errors.password = 'Informe a senha.'
  if (mode === 'register') {
    if (!f.username.trim()) errors.username = 'Informe o nome de usuário.'
    else if (!/^[a-z0-9_.]{3,20}$/.test(f.username.trim()))
      errors.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.'
    if (f.password && (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)))
      errors.password = 'A senha precisa ter no mínimo 8 caracteres, com letras e números.'
    if (!f.confirm) errors.confirm = 'Confirme a senha.'
    else if (f.confirm !== f.password) errors.confirm = 'As senhas não conferem.'
  }
  return errors
}

const ORDER: (keyof Fields)[] = ['username', 'email', 'password', 'confirm']

/** Credenciais fictícias documentadas (preenche o formulário; o login continua validado pela API) */
const DEMO_ACCOUNT = { email: 'nova@kurio.app', password: 'Kurio@123' }

export function AuthPanel({ mode, onModeChange, onSuccess, variant, notice, TitleComponent = 'h1' }: AuthPanelProps) {
  const login = useLogin()
  const register = useRegister()
  const [fields, setFields] = React.useState<Fields>(EMPTY)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const refs = React.useRef<Partial<Record<keyof Fields, HTMLInputElement | null>>>({})
  const page = variant === 'page'
  const pending = login.isPending || register.isPending
  const id = React.useId()

  // Ao trocar de aba, mantém o e-mail e limpa o resto
  React.useEffect(() => {
    setFields((f) => ({ ...EMPTY, email: f.email }))
    setErrors({})
    setFormError(null)
    setInfo(null)
  }, [mode])

  function update(field: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
    setFormError(null)
  }

  function focusFirst(errs: FieldErrors) {
    const first = ORDER.find((f) => errs[f])
    if (first) refs.current[first]?.focus()
  }

  async function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    const errs = validate(mode, fields)
    setErrors(errs)
    if (Object.keys(errs).length) return focusFirst(errs)
    try {
      const data =
        mode === 'login'
          ? await login.mutateAsync({ email: fields.email.trim(), password: fields.password })
          : await register.mutateAsync({ username: fields.username.trim(), email: fields.email.trim(), password: fields.password })
      toast(mode === 'login' ? `Olá, ${data.user.displayName}! Você entrou na sua conta.` : 'Conta criada com sucesso. Boas-vindas à Kurio!', 'success')
      onSuccess(data.user)
    } catch (error) {
      const body = isAxiosError<{ fieldErrors?: FieldErrors }>(error) ? error.response?.data : undefined
      if (body?.fieldErrors && Object.keys(body.fieldErrors).length) {
        setErrors(body.fieldErrors)
        focusFirst(body.fieldErrors)
      } else {
        setFormError(getErrorMessage(error, 'Não foi possível concluir. Tente novamente.'))
      }
    }
  }

  const unavailable = (what: string) => setInfo(`${what} não está disponível nesta demonstração. Use e-mail e senha.`)

  const title = mode === 'login' ? 'Entrar' : page ? 'Criar perfil de colecionador' : 'Criar conta'

  return (
    <div className={cn('font-mono text-kurio-cream', page ? 'px-5 pb-10' : 'pt-12')}>
      {page ? (
        <>
          <p aria-hidden className="pt-16 text-center text-[30px] font-bold tracking-[0.06em]">
            KURIO
          </p>
          <TitleComponent className="mt-16 text-center text-[19px] font-bold">{title}</TitleComponent>
        </>
      ) : (
        <>
          <TitleComponent className="sr-only">{title}</TitleComponent>
          <div role="tablist" aria-label="Acesso à conta" className="flex items-center justify-center gap-2 text-[19px] font-bold">
            {(['login', 'register'] as const).map((m, i) => (
              <React.Fragment key={m}>
                {i > 0 && <span aria-hidden className="h-6 w-px bg-kurio-orange/70" />}
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => onModeChange(m)}
                  className={cn('transition-colors', mode === m ? 'text-kurio-orange-light' : 'hover:text-kurio-orange-light')}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              </React.Fragment>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-[400px] text-center text-[13px] leading-4">
            {mode === 'login'
              ? 'Entre para gerenciar sua carteira, coleção e perfil criador.'
              : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
          </p>
        </>
      )}

      <form onSubmit={onSubmit} noValidate className={cn('mx-auto', page ? 'mt-10 max-w-[400px]' : 'mt-6 max-w-[340px]')}>
        {notice && (
          <p role="status" className="mb-4 flex gap-2 rounded-md border border-kurio-orange/60 bg-kurio-orange/10 p-3 text-[13px] leading-5">
            <Info size={15} aria-hidden className="mt-0.5 shrink-0 text-kurio-orange-light" />
            {notice}
          </p>
        )}
        {formError && (
          <p role="alert" className="mb-4 rounded-md border border-[#f4a28c]/60 px-3 py-2 text-[13px] text-[#f4a28c]">
            {formError}
          </p>
        )}

        <div className={cn(page ? 'space-y-3' : 'space-y-3')}>
          {mode === 'register' && (
            <Input
              id={`${id}-username`}
              label="Nome de usuário"
              autoComplete="username"
              autoCapitalize="none"
              value={fields.username}
              onChange={(v) => update('username', v.toLowerCase())}
              error={errors.username}
              inputRef={(el) => (refs.current.username = el)}
              page={page}
              centered={page}
            />
          )}
          <Input
            id={`${id}-email`}
            label={mode === 'login' ? 'contato@email.com' : 'Digite seu e-mail'}
            srLabel="E-mail"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={(v) => update('email', v)}
            error={errors.email}
            inputRef={(el) => (refs.current.email = el)}
            page={page}
          />
          <PasswordInput
            id={`${id}-password`}
            label="Senha"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={fields.password}
            onChange={(v) => update('password', v)}
            error={errors.password}
            inputRef={(el) => (refs.current.password = el)}
            page={page}
          />
          {mode === 'register' && (
            <PasswordInput
              id={`${id}-confirm`}
              label="Confirmar senha"
              autoComplete="new-password"
              value={fields.confirm}
              onChange={(v) => update('confirm', v)}
              error={errors.confirm}
              inputRef={(el) => (refs.current.confirm = el)}
              page={page}
              showToggle={page}
            />
          )}
        </div>

        {mode === 'login' && (
          <div className="mt-3 text-right">
            <button type="button" onClick={() => unavailable('A recuperação de senha')} className="text-sm text-kurio-orange-light hover:text-kurio-cream">
              Esqueceu a senha?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            'w-full bg-kurio-orange font-bold text-kurio-bg transition-colors hover:bg-kurio-orange-hover disabled:opacity-60',
            page ? 'mt-10 h-14 rounded-xl text-base' : 'mt-6 h-[45px] rounded-[4px] text-base',
          )}
        >
          {pending ? 'Aguarde…' : mode === 'login' ? 'Entrar' : page ? 'Criar perfil' : 'Criar conta'}
        </button>
        {mode === 'login' && (
          <p className="mt-3 text-center text-xs text-kurio-sand">
            Conta de demonstração ·{' '}
            <button
              type="button"
              onClick={() => {
                setFields((f) => ({ ...f, email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password }))
                setErrors({})
                setFormError(null)
              }}
              className="font-semibold text-kurio-orange-light underline-offset-2 hover:underline"
            >
              Usar
            </button>
          </p>
        )}
      </form>

      <div className={cn('relative text-center text-[13px]', page ? 'mx-auto mt-10 max-w-[400px]' : 'mt-8')}>
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-kurio-line" />
        <span className={cn('relative px-3', page ? 'bg-kurio-bg' : 'bg-kurio-surface')}>Ou continue com</span>
      </div>
      <div className={cn('mx-auto mt-3 space-y-3', page ? 'max-w-[400px]' : 'max-w-[340px]')}>
        <SocialButton label="Continuar com Google" icon={<GoogleIcon />} onClick={() => unavailable('O login com Google')} />
        <SocialButton label="Continuar com Facebook" icon={<FacebookLogo />} onClick={() => unavailable('O login com Facebook')} />
        {info && (
          <p role="status" className="text-center text-[13px] leading-5 text-kurio-sand">
            {info}
          </p>
        )}
      </div>

      {page && (
        <p className="mt-10 text-center text-sm text-kurio-sand">
          {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
          <button type="button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')} className="hover:text-kurio-orange-light">
            {mode === 'login' ? 'Crie uma conta' : 'Entre'}
          </button>
        </p>
      )}
    </div>
  )
}

// ─── Campos ────────────────────────────────────────────────────────────────

interface InputProps {
  id: string
  label: string
  srLabel?: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  autoComplete?: string
  autoCapitalize?: string
  inputRef: (el: HTMLInputElement | null) => void
  page: boolean
  centered?: boolean
  trailing?: React.ReactNode
}

function Input({ id, label, srLabel, value, onChange, error, type = 'text', autoComplete, autoCapitalize, inputRef, page, centered, trailing }: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {srLabel ?? label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'w-full border border-[#3f2319] text-sm text-kurio-cream placeholder:text-kurio-muted transition-colors focus-visible:border-kurio-orange focus-visible:outline-none aria-[invalid=true]:border-[#f4a28c]',
            page ? 'h-[47px] rounded-xl bg-[#120c09] px-4' : 'h-10 bg-transparent px-4',
            centered && 'text-center',
            trailing && 'pr-12',
          )}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-[#f4a28c]">
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordInput({ showToggle = true, ...props }: Omit<InputProps, 'type' | 'trailing'> & { showToggle?: boolean }) {
  const [visible, setVisible] = React.useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        showToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded text-kurio-muted hover:text-kurio-orange-light"
          >
            {visible ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}
          </button>
        )
      }
    />
  )
}

function SocialButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-sm border border-[#3f2319] text-[13px] transition-colors hover:border-kurio-sand"
    >
      {icon}
      {label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

function FacebookLogo() {
  return (
    <svg width="12" height="22" viewBox="12 8 10 18" aria-hidden focusable="false">
      <path
        fill="#4A6EC2"
        d="M15 14.3333H13V17H15V25H18.3333V17H20.7333L21 14.3333H18.3333V13.2C18.3333 12.6 18.4667 12.3333 19.0667 12.3333H21V9H18.4667C16.0667 9 15 10.0667 15 12.0667V14.3333Z"
      />
    </svg>
  )
}
