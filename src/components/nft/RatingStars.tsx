import { Star } from 'lucide-react'

/** Estrelas de avaliação (0–5); o valor numérico vai para leitores de tela */
export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const filled = Math.round(rating)
  return (
    <span
      role="img"
      aria-label={`Avaliação ${rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} de 5`}
      className="inline-flex gap-1 text-kurio-orange"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          fill={i < filled ? 'currentColor' : 'none'}
          className={i < filled ? '' : 'opacity-50'}
        />
      ))}
    </span>
  )
}
