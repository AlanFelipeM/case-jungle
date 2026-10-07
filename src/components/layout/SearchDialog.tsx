import React from 'react'
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { SearchIcon } from '@/components/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function SearchDialog() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const currentQuery = useSearch({ strict: false, select: (s) => ('q' in s ? s.q : undefined) })
  const [open, setOpen] = React.useState(false)
  const [term, setTerm] = React.useState('')
  const inputId = React.useId()

  function onOpenChange(next: boolean) {
    if (next) setTerm(currentQuery ?? '')
    setOpen(next)
  }

  function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    const q = term.trim()
    setOpen(false)
    // Na Home, mantém os filtros atuais e reinicia a paginação
    navigate({
      to: '/',
      search: (prev) => ({ ...(pathname === '/' ? prev : {}), q: q || undefined, page: undefined }),
      hash: 'catalogo',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        aria-label="Buscar NFTs"
        className="grid size-10 place-items-center rounded-md transition-colors hover:text-kurio-orange-light"
      >
        <SearchIcon size={20} />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold">Buscar NFTs</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-kurio-sand">
          Pesquise por nome do NFT, coleção ou criador.
        </DialogDescription>
        <form onSubmit={onSubmit} role="search" className="mt-5 flex h-11">
          <label htmlFor={inputId} className="sr-only">
            Termo de busca
          </label>
          <input
            id={inputId}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ex.: Golden, Jungle Apes, CryptoArtist..."
            maxLength={80}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-l-[4px] bg-[#38220f] px-3 text-base text-kurio-cream placeholder:text-kurio-muted focus-visible:outline-offset-0"
          />
          <button
            type="submit"
            className="shrink-0 rounded-r-[4px] bg-kurio-orange px-5 font-semibold text-kurio-bg transition-colors hover:bg-kurio-orange-hover"
          >
            Buscar
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
