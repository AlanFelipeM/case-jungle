import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, MapPin } from 'lucide-react'
import type { User } from '@/types'
import { useLogout } from '@/hooks/useAuth'
import { HeartOutlineIcon, LogoutIcon, UserIcon, UserOutlineIcon } from '@/components/icons'
import { toast } from '@/lib/toast'
import { isProtectedPath } from '@/components/auth/AuthProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Avatar padrão do usuário (ou a foto, quando houver) */
export function UserAvatar({ user, size = 32 }: { user: User; size?: number }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-[#2f1d15] text-kurio-orange-light ring-1 ring-kurio-orange/50"
      style={{ width: size, height: size }}
    >
      <UserIcon size={size * 0.6} />
    </span>
  )
}

/** Menu da conta na navbar (substitui o botão "Entrar" quando há sessão) */
export function UserMenu({ user }: { user: User }) {
  const navigate = useNavigate()
  const logout = useLogout()

  function signOut() {
    logout.mutate(undefined, {
      onSettled: () => {
        toast('Você saiu da sua conta.')
        if (isProtectedPath(window.location.pathname)) navigate({ to: '/', replace: true })
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${user.displayName}`}
        className="ml-7 flex h-10 items-center gap-2 rounded-md px-1 transition-colors hover:text-kurio-orange-light data-[state=open]:text-kurio-orange-light"
      >
        <UserAvatar user={user} />
        <span className="hidden max-w-[14ch] truncate text-sm lg:inline">{user.displayName}</span>
        <ChevronDown size={14} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block truncate text-sm text-kurio-cream">{user.displayName}</span>
          <span className="block truncate">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: '/perfil' })}>
          <UserOutlineIcon size={16} /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: '/perfil/carteiras' })}>
          <MapPin size={16} aria-hidden /> Carteiras
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: '/perfil/lista-de-interesse' })}>
          <HeartOutlineIcon size={15} /> Lista de interesse
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogoutIcon size={16} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
