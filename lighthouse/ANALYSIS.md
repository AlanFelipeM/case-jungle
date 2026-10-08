# Análise da auditoria Lighthouse

Os números estão em [RESULTS.md](RESULTS.md), gerado por `npm run audit`, e os relatórios completos em [reports/](reports/). O protocolo é este:
- o Lighthouse 13.5 roda no Chromium do Playwright;
- a aplicação é o build de produção com os mocks ativos no cenário padrão;
- são feitas 3 medições por página e perfil, e o resultado reportado é a mediana.

## Resumo

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 87 | 100 | 100 | 100 | 3,68 s | 0 | 91 ms |
| Detalhe do NFT | mobile | 88 | 100 | 100 | 100 | 3,62 s | 0 | 60 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 0,79 s | 0 | 2 ms |
| Detalhe do NFT | desktop | 100 | 100 | 100 | 100 | 0,75 s | 0 | 0 ms |

Accessibility, Best Practices e SEO atingem 100 em todos os casos, e a Performance desktop também. **A Performance mobile ficou abaixo da meta de 90**, em 87 e 88. A causa é o LCP: CLS e TBT estão dentro do limite "bom". As medições variaram no máximo 1 ponto entre si.

## Por que o mobile fica abaixo de 90

No perfil mobile, o Lighthouse simula um Moto G Power com 4G lento (cerca de 1,6 Mbps e 150 ms de RTT) e CPU 4× mais lenta. Nessas condições, o LCP de cerca de 3,6 s é composto por três fatores, todos ligados ao ambiente simulado da demonstração.

1. **A camada de mocks está no caminho crítico.** A aplicação só renderiza depois que o MSW passa a interceptar a rede; sem isso, as primeiras requisições escapariam para o servidor. Por isso, o chunk dos mocks precisa ser baixado e executado antes da primeira renderização. Isso inclui:
   - o `msw`, com o `tough-cookie` e o `tldts` que ele usa internamente;
   - o binding Socket.IO;
   - os fixtures e os handlers.

   São cerca de 115 KB gzip dos 341 KB de JavaScript da página, além do registro do service worker. No 4G lento simulado, esses bytes custam por volta de 0,6 s. Essa é uma estimativa feita a partir da banda simulada, não uma medição isolada. Um build apontando para uma API real não carrega nada disso.
2. **A latência simulada da API.** As imagens do LCP dependem dos dados: no Início, a imagem do primeiro card do catálogo; no Detalhe, a imagem principal do NFT. No cenário padrão, os handlers respondem `/api/nfts` e `/api/nfts/:id` com 300 a 500 ms de latência simulada, e é isso que o detalhamento do LCP mostra como *resource load delay* (cerca de 760 a 800 ms na medição sem limitação). Essa latência faz parte do cenário padrão e foi mantida, porque o README pede a auditoria "sem simplificações exclusivas para melhorar a pontuação".
3. **O peso do JavaScript essencial.** React, TanStack Router, TanStack Query, Axios e Radix somam cerca de 220 KB gzip, todos exigidos pela stack. O Lighthouse aponta de 79 a 107 KiB de JavaScript não usado na primeira tela, quase todo em componentes do Radix (select, slider, dialog) que a página monta mas só usa na interação.

No desktop, com rede rápida e sem limitação de CPU, os mesmos fatores somam menos de 0,8 s de LCP, e a nota é 100.

## O que foi feito para melhorar

| Mudança | Efeito medido |
| --- | --- |
| Code-splitting das rotas (exceto Início e Detalhe, que são telas de entrada) e vendor em chunks estáveis | Maior chunk de 243 → 69 KB gzip; rotas internas carregam sob demanda |
| Remoção do `@import` do Google Fonts (Inter e Space Grotesk, não usadas) que bloqueava a renderização | Menos uma requisição externa bloqueante; fonte base passa a ser a Roboto Mono local |
| Entrada enxuta: aplicação e mocks baixam em paralelo (`src/main.tsx`) | FCP mobile de 2,8 s → 2,0–2,3 s |
| Detalhe no bundle principal e altura mínima no `main` enquanto uma rota carrega | CLS do Detalhe desktop de 0,273 → 0, e Performance de 86 → 100 |
| Primeira linha de cards do catálogo sem lazy loading e com `fetchpriority="high"` | Imagem do LCP no Início deixa de esperar o lazy loading |
| `favicon.svg` e `robots.txt` adicionados | Sem 404 no console (Best Practices) e `robots.txt` válido (SEO) |

Já existia antes desta auditoria:
- a imagem principal do detalhe tem `fetchpriority="high"` e `srcset` com 480 e 900 px em WebP;
- as imagens do hero também usam `srcset` e prioridade;
- as dimensões são reservadas, por isso o CLS é 0.

## Tentativas descartadas

- **Agrupar a camada de mocks num chunk manual (`manualChunks`).** O Rollup moveu para esse chunk módulos compartilhados com a aplicação, como os tipos e as regras de validação, e a aplicação passou a depender dele estaticamente. A Performance mobile do Início caiu de 87 para 82, então a mudança foi revertida.
- **Reduzir a latência dos handlers ou renderizar antes do MSW.** Isso melhoraria a nota só no ambiente da auditoria e, no segundo caso, deixaria requisições escaparem. As duas opções contrariam o README.

## Como reproduzir

```bash
npx playwright install chromium   # o Chromium usado na auditoria
npm run audit                     # build com VITE_ENABLE_MSW=true + vite preview + 12 medições
```

A configuração está versionada em [config.mjs](config.mjs): páginas, perfis, número de medições, metas e flags do Chrome. O script está em [scripts/lighthouse.mjs](../scripts/lighthouse.mjs). Cada execução regenera `RESULTS.md`, `summary.json` e os relatórios HTML e JSON da medição mediana de cada página e perfil. O ambiente da última execução fica registrado no fim de `RESULTS.md`: versões, sistema, CPU e memória.
