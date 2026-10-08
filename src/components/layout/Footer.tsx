import React from 'react'
import { Link } from '@tanstack/react-router'
import { FacebookIcon, InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from '@/components/icons'
import { useNewsletterSignup, getErrorMessage, isValidationError } from '@/hooks/useNewsletter'
import { cn } from '@/lib/utils'
import type { NFTCategory } from '@/types'

const FEATURES = [
  {
    icon: 'W',
    title: 'Segurança da carteira',
    desc: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    icon: 'C',
    title: 'Criadores em destaque',
    desc: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    icon: 'D',
    title: 'Alertas de lançamentos',
    desc: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

type FooterLink = { label: string } & (
  | { to: '/perfil' | '/perfil/colecao' | '/perfil/atividade' | '/perfil/lista-de-interesse' | '/estudio' }
  | { to: '/ajuda/$'; splat: string }
  | { to: '/'; category: NFTCategory }
)

const FOOTER_LINKS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/perfil' },
      { label: 'Minha coleção', to: '/perfil/colecao' },
      { label: 'Atividade', to: '/perfil/atividade' },
      { label: 'Estúdio do criador', to: '/estudio' },
      { label: 'Lista de interesse', to: '/perfil/lista-de-interesse' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda', to: '/ajuda/$', splat: 'central' },
      { label: 'Como comprar NFTs', to: '/ajuda/$', splat: 'como-comprar' },
      { label: 'Carteira e segurança', to: '/ajuda/$', splat: 'carteira' },
      { label: 'Política do mercado', to: '/ajuda/$', splat: 'politica' },
      { label: 'Denunciar item', to: '/ajuda/$', splat: 'denunciar' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', to: '/', category: 'arte-digital' },
      { label: 'Fotografia', to: '/', category: 'fotografia' },
      { label: 'Música', to: '/', category: 'musica' },
      { label: 'Arte 3D', to: '/', category: 'arte-3d' },
      { label: 'Utilidade', to: '/', category: 'utilidade' },
    ],
  },
]

const SOCIAL_LINKS = [
  { label: 'Facebook', icon: FacebookIcon, href: 'https://facebook.com' },
  { label: 'Instagram', icon: InstagramIcon, href: 'https://instagram.com' },
  { label: 'X (Twitter)', icon: XIcon, href: 'https://x.com' },
  { label: 'LinkedIn', icon: LinkedinIcon, href: 'https://linkedin.com' },
  { label: 'YouTube', icon: YoutubeIcon, href: 'https://youtube.com' },
]

const WALLETS = ['MetaMask', 'WalletConnect', 'Coinbase']

// Colunas compartilhadas pela faixa de contato e pelos links (medidas do Figma)
const COLUMNS = 'grid px-6 sm:grid-cols-2 sm:gap-x-6 sm:px-8 lg:grid-cols-[302px_303px_303px_1fr] lg:gap-0'

const LINK_CLASS = 'inline-block py-[5px] text-sm leading-5 transition-colors hover:text-kurio-orange-light'

function FooterNavLink({ link }: { link: FooterLink }) {
  if (link.to === '/') {
    return (
      <Link to="/" search={{ category: link.category }} hash="catalogo" className={LINK_CLASS}>
        {link.label}
      </Link>
    )
  }
  if ('splat' in link) {
    return (
      <Link to={link.to} params={{ _splat: link.splat }} className={LINK_CLASS}>
        {link.label}
      </Link>
    )
  }
  return (
    <Link to={link.to} className={LINK_CLASS}>
      {link.label}
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-[1440px] px-4 pb-6 font-mono text-kurio-cream md:px-6">
      <div className="mx-auto max-w-[1200px]">
        {/* Diferenciais + newsletter */}
        <div className="grid grid-cols-1 gap-8 bg-kurio-surface px-6 py-8 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-0 lg:pt-8 lg:pr-6 lg:pb-[18px] lg:pl-12">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={cn('lg:pr-4', i > 0 && 'lg:border-l lg:border-kurio-orange lg:pl-4')}
            >
              <span
                aria-hidden
                className="grid size-[74px] place-items-center rounded-full bg-kurio-orange text-xl font-bold text-kurio-bg"
              >
                {feature.icon}
              </span>
              <h2 className="mt-2.5 text-base leading-6 font-semibold">{feature.title}</h2>
              <p className="mt-1.5 max-w-[190px] text-sm leading-[22px] text-kurio-sand">{feature.desc}</p>
            </div>
          ))}

          <NewsletterForm />
        </div>

        {/* Faixa de contato */}
        <div className={cn(COLUMNS, 'items-center gap-3 bg-[#38220f] py-6 text-sm leading-[22px] lg:min-h-[88px] lg:py-0')}>
          <Link to="/" className="w-fit font-bold tracking-[0.1em]" aria-label="Kurio — página inicial">
            KURIO
          </Link>
          <p className="max-w-[230px]">Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className="w-fit hover:text-kurio-orange-light">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="w-fit hover:text-kurio-orange-light">
            +55 11 4002 8922
          </a>
        </div>

        {/* Links */}
        <div className={cn(COLUMNS, 'grid-cols-2 gap-x-4 gap-y-8 bg-kurio-surface pt-[29px] pb-[30px]')}>
          {FOOTER_LINKS.map((group, i) => (
            <nav key={group.title} aria-labelledby={`footer-links-${i}`}>
              <h2 id={`footer-links-${i}`} className="text-lg leading-6 font-semibold">
                {group.title}
              </h2>
              <ul className="mt-[3px]">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <FooterNavLink link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 sm:col-span-1">
            <h2 className="text-lg leading-6 font-semibold">Redes sociais</h2>
            <ul className="mt-[15px] flex gap-2">
              {SOCIAL_LINKS.map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="block size-8 rounded-[4px] text-kurio-orange shadow-[inset_0_0_0_1px_var(--color-kurio-orange)] transition-colors hover:bg-kurio-orange hover:text-kurio-bg"
                  >
                    <Icon size={32} />
                  </a>
                </li>
              ))}
            </ul>

            <h2 className="mt-[27px] text-lg leading-6 font-semibold">Carteiras compatíveis</h2>
            <p className="mt-2.5 inline-flex h-6 items-center rounded-[4px] border border-kurio-line bg-[#38220f] px-2.5 text-[9px] font-bold tracking-[0.04em] text-kurio-orange-light uppercase">
              {WALLETS.map((wallet, i) => (
                <React.Fragment key={wallet}>
                  {i > 0 && (
                    <span aria-hidden className="mx-2">
                      •
                    </span>
                  )}
                  {wallet}
                  {i < WALLETS.length - 1 && <span className="sr-only">, </span>}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>

        <p className="mt-[11px] text-center text-sm leading-5">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}

function NewsletterForm() {
  const signup = useNewsletterSignup()
  const [email, setEmail] = React.useState('')
  const feedbackId = React.useId()
  const invalid = signup.isError && isValidationError(signup.error)

  function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    signup.mutate(email.trim())
  }

  return (
    <div className="lg:border-l lg:border-kurio-orange lg:pl-4">
      <h2 className="max-w-[240px] text-base leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
      <form onSubmit={onSubmit} className="mt-4 flex h-10" noValidate>
        <label htmlFor={`${feedbackId}-email`} className="sr-only">
          Seu e-mail
        </label>
        <input
          id={`${feedbackId}-email`}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (signup.isError) signup.reset()
          }}
          placeholder="digite seu e-mail..."
          aria-invalid={invalid || undefined}
          aria-describedby={feedbackId}
          className="min-w-0 flex-1 rounded-l-[4px] bg-[#38220f] px-3 text-sm text-kurio-cream placeholder:text-kurio-muted focus-visible:outline-offset-0"
        />
        <button
          type="submit"
          disabled={signup.isPending}
          className="shrink-0 rounded-[4px] bg-kurio-orange px-4 text-lg font-bold text-kurio-bg transition-colors hover:bg-kurio-orange-hover disabled:opacity-70"
        >
          {signup.isPending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
      <p
        id={feedbackId}
        aria-live="polite"
        className={cn(
          'mt-3 max-w-[300px] text-[13px] leading-[22px]',
          invalid ? 'text-[#f4a28c]' : signup.isError ? 'text-kurio-cream' : 'text-kurio-sand',
        )}
      >
        {signup.isError
          ? getErrorMessage(signup.error)
          : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </div>
  )
}
