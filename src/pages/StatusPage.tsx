import { Link } from '@tanstack/react-router'

interface StatusPageProps {
  eyebrow: string
  title: string
  description: string
}

function StatusPage({ eyebrow, title, description }: StatusPageProps) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[1200px] flex-col items-start justify-center px-4 py-16 font-mono text-kurio-cream md:px-6">
      <p className="text-sm tracking-[0.1em] text-kurio-orange-light uppercase">{eyebrow}</p>
      <h1 className="mt-3 text-[28px] leading-[1.4] font-bold uppercase sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-6 text-kurio-sand">{description}</p>
      <Link
        to="/"
        className="mt-8 inline-flex h-10 items-center rounded-[4px] bg-kurio-orange px-8 font-semibold text-kurio-bg uppercase transition-colors hover:bg-kurio-orange-hover"
      >
        Voltar ao início
      </Link>
    </section>
  )
}

/** Telas previstas no escopo que ainda serão implementadas */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <StatusPage
      eyebrow="Em construção"
      title={title}
      description="Esta tela faz parte do marketplace e ainda está sendo implementada."
    />
  )
}

/** Seções editoriais e auxiliares fora do escopo da demonstração */
export function UnavailablePage({ title }: { title: string }) {
  return (
    <StatusPage
      eyebrow="Indisponível"
      title={title}
      description="Este conteúdo não faz parte desta demonstração do marketplace. Explore o catálogo para descobrir NFTs."
    />
  )
}

export function NotFoundPage() {
  return (
    <StatusPage
      eyebrow="Erro 404"
      title="Página não encontrada"
      description="O endereço acessado não existe ou foi removido. Confira o link ou volte ao início."
    />
  )
}
