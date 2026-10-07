import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import apeEmerald900 from '@/img/ape-emerald-900.webp'
import apeIvory900 from '@/img/ape-ivory-900.webp'

interface PromoCard {
  /** Linhas do título como no Figma (quebradas apenas no desktop) */
  titleLines: [string, string]
  description: string
  ctaLabel: string
  tab?: 'new'
  image: string
}

const PROMO_CARDS: PromoCard[] = [
  {
    titleLines: ['Lançamentos gênesis', 'de edição limitada'],
    description:
      'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    ctaLabel: 'Explorar',
    tab: 'new',
    image: apeEmerald900,
  },
  {
    titleLines: ['Arte digital selecionada', 'e muito mais'],
    description:
      'Explore novos artistas, coleções verificadas e obras digitais que definem a era.',
    ctaLabel: 'Explorar',
    image: apeIvory900,
  },
]

export function PromoSection() {
  return (
    <section aria-labelledby="promo-heading" className="mx-auto mt-24 max-w-[1200px] font-mono">
      <h2 id="promo-heading" className="sr-only">
        Destaques e promoções
      </h2>
      <div className="grid gap-7 lg:grid-cols-2">
        {PROMO_CARDS.map((card) => {
          const title = card.titleLines.join(' ')
          return (
          <article
            key={title}
            className="group flex flex-col overflow-hidden rounded-lg bg-kurio-surface sm:min-h-[250px] sm:flex-row"
          >
            <div className="relative aspect-[287/250] w-full shrink-0 sm:aspect-auto sm:w-[287px] lg:w-[49%]">
              <img
                src={card.image}
                alt=""
                width={287}
                height={250}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full rounded-2xl object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col items-end px-5 pt-5 pb-6 text-right sm:pl-4 sm:pt-[38px] sm:pr-[30px] lg:pl-1.5">
              <h3 className="text-base leading-6 font-bold text-kurio-cream sm:text-lg">
                <span className="lg:block">{card.titleLines[0]}</span>{' '}
                <span className="lg:block">{card.titleLines[1]}</span>
              </h3>
              <p className="mt-2 max-w-[270px] text-sm leading-6 text-kurio-sand">{card.description}</p>
              <Link
                to="/"
                search={{ tab: card.tab }}
                hash="catalogo"
                className="mt-3 inline-flex h-10 w-[140px] shrink-0 items-center justify-center gap-1 rounded-[4px] bg-kurio-orange text-base font-medium text-kurio-bg transition-colors hover:bg-kurio-orange-hover"
                aria-label={`${card.ctaLabel}: ${title}`}
              >
                {card.ctaLabel}
                <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </article>
          )
        })}
      </div>
    </section>
  )
}
