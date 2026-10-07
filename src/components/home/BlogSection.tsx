import { Link } from '@tanstack/react-router'
import { useBlogPosts } from '@/hooks/useNFTs'
import { BlogCardSkeleton } from '@/components/ui/Skeleton'

export function BlogSection() {
  const { data: posts, isLoading, isError } = useBlogPosts()

  return (
    <section aria-labelledby="blog-heading" className="mx-auto mt-24 max-w-[1200px] font-mono">
      <div className="text-center">
        <h2 id="blog-heading" className="text-2xl leading-9 font-bold text-kurio-cream sm:text-[28px]">
          Diário da Cunhagem
        </h2>
        <p className="mt-[11px] text-sm leading-5 text-kurio-sand">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-10 text-center text-sm text-kurio-sand" role="alert">
          Não foi possível carregar os artigos agora.
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {posts?.map((post) => (
            <li key={post.id}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-kurio-surface">
                <div className="aspect-[268/195] overflow-hidden">
                  <img
                    src={post.image}
                    alt=""
                    width={268}
                    height={195}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover object-[50%_30%] transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
                  <p className="text-xs leading-4 text-kurio-sand">
                    <time>{post.date}</time>
                    <span aria-hidden className="mx-3 text-[#79644f]">
                      |
                    </span>
                    <span className="sr-only">, </span>
                    Leitura de {post.readTime} min
                  </p>

                  <h3 className="mt-2.5 text-base leading-[21px] font-semibold text-kurio-cream">
                    {/* Link esticado: o card inteiro leva ao artigo */}
                    <Link
                      to="/blog/$slug"
                      params={{ slug: post.slug }}
                      className="after:absolute after:inset-0 after:content-[''] group-hover:text-kurio-orange-light"
                    >
                      {post.title}
                    </Link>
                  </h3>

                  <p className="mt-2.5 text-xs leading-4 text-kurio-sand">{post.excerpt}</p>

                  <p aria-hidden className="mt-auto pt-2 text-xs leading-4 font-medium text-kurio-orange-light">
                    Ler mais →
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
