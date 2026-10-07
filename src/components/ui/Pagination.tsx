import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

const WINDOW = 4

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  // Janela de até 4 páginas que acompanha a página atual
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - WINDOW + 1))
  const pages = Array.from({ length: Math.min(WINDOW, totalPages) }, (_, i) => start + i)

  const base =
    'grid size-[35px] place-items-center rounded-[4px] border text-base transition-colors'
  const idle = 'border-kurio-outline text-kurio-cream hover:border-kurio-orange hover:text-kurio-orange-light'

  return (
    <nav aria-label="Paginação" className={cn('font-mono', className)}>
      <ul className="flex items-center gap-2">
        {currentPage > 1 && (
          <li>
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              aria-label="Página anterior"
              className={cn(base, idle)}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
          </li>
        )}

        {pages.map((page) => {
          const active = page === currentPage
          return (
            <li key={page}>
              <button
                type="button"
                onClick={() => onPageChange(page)}
                aria-label={`Página ${page}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  base,
                  active ? 'border-kurio-orange bg-kurio-orange font-bold text-kurio-bg' : idle,
                )}
              >
                {page}
              </button>
            </li>
          )
        })}

        {currentPage < totalPages && (
          <li>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              aria-label="Próxima página"
              className={cn(base, idle)}
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
