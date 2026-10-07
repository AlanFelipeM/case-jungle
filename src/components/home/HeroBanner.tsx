import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Pause, Play } from 'lucide-react'
import { useBanners } from '@/hooks/useNFTs'
import { HeroSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 6000
const SWIPE_THRESHOLD = 40

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
  const swipeStart = React.useRef<number | null>(null)

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

  // Arrastar para os lados troca de slide (toque)
  function onPointerUp(event: React.PointerEvent) {
    if (swipeStart.current === null || total < 2) return
    const dx = event.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dx) >= SWIPE_THRESHOLD) goTo(active + (dx < 0 ? 1 : -1))
  }

  function onCtaClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate({ href: current!.ctaHref })
  }

  const slideId = `hero-slide-${current.id}`
  const mobileTitle = current.mobileTitle ?? current.title
  const mobileDescription = current.mobileDescription ?? current.description

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
      {/* No mobile o destaque é um card com gradiente; a partir de md, o layout aberto */}
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(100deg,#6b472a_0%,#563820_45%,#2b1c12_100%)] px-4 pt-3.5 pb-7 md:overflow-visible md:rounded-none md:bg-none md:p-0">
        <span
          aria-hidden
          className="absolute -top-24 -left-16 size-64 rounded-full bg-[#8a5d36]/30 md:hidden"
        />
        <span
          aria-hidden
          className="absolute -top-6 left-[38%] size-56 rounded-full bg-[#8a5d36]/20 md:hidden"
        />

        <div
          key={current.id}
          id={slideId}
          role="tabpanel"
          aria-roledescription="slide"
          aria-label={`${active + 1} de ${total}`}
          aria-live={playing ? 'off' : 'polite'}
          onPointerDown={(e) => (swipeStart.current = e.clientX)}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeStart.current = null)}
          className="relative grid touch-pan-y grid-cols-[1fr_128px] items-center gap-3 motion-safe:animate-hero-fade md:grid-cols-1 md:items-stretch md:gap-8 lg:grid-cols-[1fr_400px] lg:gap-[30px] xl:grid-cols-[1fr_450px]"
        >
          {/* Texto */}
          <div className="flex min-w-0 flex-col lg:pt-10 lg:pl-10">
            <p className="text-[11px] leading-4 md:text-sm md:leading-5 md:tracking-[0.1em]">
              {current.subtitle}
            </p>

            <h1 className="mt-0.5 text-[17px] leading-[1.7] font-bold tracking-[-0.01em] uppercase md:mt-3 md:max-w-[20ch] md:text-4xl md:leading-[1.5] lg:text-[40px] xl:text-[44px]">
              <span className="md:hidden">{mobileTitle}</span>
              <span className="hidden md:inline">{current.title}</span>
            </h1>

            <p className="mt-1 text-[11px] leading-[1.55] text-[#e6d5bf] md:mt-2 md:max-w-[66ch] md:text-sm md:leading-6 md:text-kurio-sand">
              <span className="md:hidden">{mobileDescription}</span>
              <span className="hidden md:inline">{current.description}</span>
            </p>

            <div className="mt-1 md:mt-8">
              <a
                href={current.ctaHref}
                onClick={onCtaClick}
                className="inline-flex items-center gap-2 py-0.5 text-xs font-bold uppercase text-[#f2b071] transition-colors hover:text-kurio-cream md:h-10 md:justify-center md:rounded-[4px] md:bg-kurio-orange md:px-8 md:py-0 md:text-base md:font-semibold md:text-kurio-bg md:hover:bg-kurio-orange-hover md:hover:text-kurio-bg"
              >
                {current.ctaLabel}
                <ArrowRight size={16} aria-hidden className="md:hidden" />
              </a>
            </div>
          </div>

          {/* Imagem do NFT */}
          <div className="relative w-full md:mx-auto md:max-w-[450px] lg:max-w-none">
            <img
              src={current.image}
              srcSet={current.imageSrcSet}
              sizes="(max-width: 767px) 128px, (min-width: 1280px) 450px, (min-width: 1024px) 400px, 450px"
              alt={current.imageAlt}
              width={450}
              height={450}
              decoding="async"
              fetchPriority={active === 0 ? 'high' : 'auto'}
              draggable={false}
              className="aspect-square w-full rounded-xl object-cover md:rounded-3xl"
            />
            {current.accentImage && (
              <img
                src={current.accentImage}
                alt=""
                width={52}
                height={52}
                decoding="async"
                draggable={false}
                className="absolute -bottom-1.5 left-2.5 size-[52px] rounded-lg object-cover md:hidden"
              />
            )}
          </div>
        </div>

        {/* Controles do carrossel */}
        {total > 1 && (
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center md:static md:mt-6 md:translate-x-0 md:justify-center lg:absolute lg:right-[calc(400px+30px+40px)] lg:bottom-[35px] lg:left-auto lg:mt-0 xl:right-[calc(450px+30px+40px)]">
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
      </div>
    </section>
  )
}
