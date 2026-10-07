import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Pause, Play } from 'lucide-react'
import { useBanners } from '@/hooks/useNFTs'
import { HeroSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 6000

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export function HeroBanner() {
  const { data: banners, isLoading } = useBanners()
  const navigate = useNavigate()
  const reducedMotion = usePrefersReducedMotion()

  const [active, setActive] = React.useState(0)
  // Pausa explícita do usuário (botão) vs. pausa temporária (hover/foco)
  const [userPaused, setUserPaused] = React.useState(false)
  const [interacting, setInteracting] = React.useState(false)
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const total = banners?.length ?? 0
  const playing = total > 1 && !userPaused && !interacting && !reducedMotion

  React.useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % total)
    }, AUTOPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [playing, active, total])

  if (isLoading) return <HeroSkeleton />

  const current = banners?.[active]
  if (!banners || !current) return null

  function goTo(index: number, focus = false) {
    const next = (index + total) % total
    setActive(next)
    if (focus) tabRefs.current[next]?.focus()
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: total - 1,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    goTo(keys[event.key], true)
  }

  function onCtaClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate({ href: current!.ctaHref })
  }

  const slideId = `hero-slide-${current.id}`

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="relative mx-auto max-w-[1200px] font-mono text-kurio-cream"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false)
      }}
    >
      <div
        key={current.id}
        id={slideId}
        role="tabpanel"
        aria-roledescription="slide"
        aria-label={`${active + 1} de ${total}`}
        aria-live={playing ? 'off' : 'polite'}
        className="grid gap-8 motion-safe:animate-hero-fade lg:grid-cols-[1fr_400px] lg:gap-[30px] xl:grid-cols-[1fr_450px]"
      >
        {/* Texto */}
        <div className="flex flex-col lg:pl-10 lg:pt-10">
          <p className="text-sm leading-5 tracking-[0.1em]">{current.subtitle}</p>

          <h1 className="mt-3 max-w-[20ch] text-[28px] leading-[1.5] font-bold tracking-[-0.01em] uppercase sm:text-4xl lg:text-[40px] xl:text-[44px]">
            {current.title}
          </h1>

          <p className="mt-2 max-w-[66ch] text-sm leading-6 text-kurio-sand">
            {current.description}
          </p>

          <div className="mt-8">
            <a
              href={current.ctaHref}
              onClick={onCtaClick}
              className="inline-flex h-10 items-center justify-center rounded-[4px] bg-kurio-orange px-8 text-base font-semibold uppercase text-kurio-bg transition-colors hover:bg-kurio-orange-hover"
            >
              {current.ctaLabel}
            </a>
          </div>
        </div>

        {/* Imagem do NFT */}
        <div className="mx-auto w-full max-w-[450px] lg:max-w-none">
          <img
            src={current.image}
            srcSet={current.imageSrcSet}
            sizes="(min-width: 1280px) 450px, (min-width: 1024px) 400px, (min-width: 482px) 450px, calc(100vw - 32px)"
            alt={current.imageAlt}
            width={450}
            height={450}
            decoding="async"
            fetchPriority={active === 0 ? 'high' : 'auto'}
            className="aspect-square w-full rounded-3xl object-cover"
          />
        </div>
      </div>

      {/* Controles do carrossel */}
      {total > 1 && (
        <div className="mt-6 flex items-center justify-center lg:absolute lg:bottom-[35px] lg:right-[calc(400px+30px+40px)] lg:mt-0 xl:right-[calc(450px+30px+40px)]">
          <div role="tablist" aria-label="Escolher destaque" className="flex">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-controls={i === active ? slideId : undefined}
                aria-label={`Destaque ${i + 1}: ${banner.title}`}
                tabIndex={i === active ? 0 : -1}
                onClick={() => goTo(i)}
                onKeyDown={onTabKeyDown}
                className="group grid size-6 place-items-center rounded-full"
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-2 rounded-full bg-kurio-orange transition-opacity',
                    i === active ? 'opacity-100' : 'opacity-60 group-hover:opacity-90',
                  )}
                />
              </button>
            ))}
          </div>

          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? 'Retomar rotação dos destaques' : 'Pausar rotação dos destaques'}
              className="grid size-6 place-items-center rounded-full text-kurio-orange opacity-60 transition-opacity hover:opacity-100"
            >
              {userPaused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
