# Kurio — Marketplace de NFTs

Frontend do marketplace Kurio: descoberta de NFTs, carrinho, checkout com carteira simulada, confirmação de pedido e área do colecionador. Toda a API (REST e Socket.IO) é simulada na camada de rede com MSW, então o projeto roda sem backend.

> Decisões de arquitetura, contratos e limitações: [ARCHITECTURE.md](ARCHITECTURE.md).
> Enunciado original: [docs/DESAFIO.md](docs/DESAFIO.md).

## Stack

React 19 · TypeScript · Vite 6 · TanStack Router · TanStack Query · Axios · Tailwind CSS v4 · shadcn/ui (Radix) · MSW 2 · Socket.IO (`socket.io-client` + `@mswjs/socket.io-binding`) · Playwright

## Setup

Requisitos: Node.js 20+ e npm.

```bash
npm ci
npm run dev        # http://localhost:5173, mocks ativos
```

O service worker do MSW já está versionado em `public/mockServiceWorker.js`. Se for preciso regenerá-lo:

```bash
npx msw init public
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com mocks (MSW sempre ativo em dev) |
| `npm run build` | Verificação de tipos (`tsc -b`) e build de produção em `dist/` |
| `npm run preview` | Serve o build de `dist/` |
| `npm run typecheck` | Verificação de tipos sem gerar arquivos |
| `npm run lint` | ESLint (TypeScript, regras de hooks e Fast Refresh), sem avisos tolerados |
| `npm run test:e2e` | Testes E2E e regressão visual (sobe o `npm run dev` automaticamente) |
| `npm run test:e2e:ui` | Playwright em modo interativo |
| `npm run test:e2e:update` | Regenera as baselines de regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML da última execução |
| `npm run audit` | Auditoria Lighthouse (build de demonstração + 3 medições por página e perfil) |

### Build de demonstração (com mocks)

Em produção os mocks só ligam com `VITE_ENABLE_MSW=true`:

```bash
# bash
VITE_ENABLE_MSW=true npm run build && npm run preview
# PowerShell
$env:VITE_ENABLE_MSW="true"; npm run build; npm run preview
```

## Variáveis de ambiente

Nenhuma é obrigatória para rodar localmente.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MSW` | — | `true` ativa os mocks no build de produção (em `dev` estão sempre ativos) |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.app` | Endereço do servidor Socket.IO. No ambiente de mocks esse endereço é interceptado pelo MSW, nenhuma conexão real é aberta |

## Credenciais fictícias

| Usuário | E-mail | Senha | Carteiras |
| --- | --- | --- | --- |
| Nova Sato (`nova.kurio`) | `nova@kurio.app` | `Kurio@123` | Principal (Ethereum) e secundária (Polygon) |
| Leo Martins (`leo.mint`) | `leo@kurio.app` | `Kurio@456` | Apenas principal (Ethereum) |

No modal de login, o atalho **"Conta de demonstração · Usar"** preenche a conta da Nova. O cadastro aceita qualquer e-mail novo e já entra na conta criada.

As senhas são guardadas apenas como hash SHA-256 com salt (nunca em claro).

### Cupons

| Código | Resultado |
| --- | --- |
| `KURIO10` | 10% de desconto |
| `GENESIS5` | 5% de desconto |
| `LANCAMENTO` | Cupom expirado (`COUPON_EXPIRED`) |
| qualquer outro | Cupom inválido (`COUPON_INVALID`) |

## Cenários e reset

Os mocks expõem controles no console do navegador em `window.__kurioMock`. Eles funcionam em `dev` e no build de demonstração.

```js
// Checkout (persistido no localStorage, sobrevive a refresh)
__kurioMock.getScenario()
__kurioMock.setScenario({ payment: 'reject' })            // pagamento recusado
__kurioMock.setScenario({ walletConnection: 'reject' })   // carteira recusa a conexão
__kurioMock.setScenario({ orderResponseDelayMs: 10000 })  // resposta do pedido após o timeout de 8s
__kurioMock.setScenario({ paymentDelayMs: 15000 })        // pedido fica pendente por 15s
__kurioMock.setScenario({ networkLatencyMs: 2000, latencyJitterMs: 800 }) // lentidão e latência variável em toda a API

// Falhas: a próxima requisição que casar com método + caminho recebe o status
// (persistidas: valem também para a próxima carga da página)
__kurioMock.failNext('PUT', '/api/favorites', 503)
__kurioMock.failNext('GET', '/api/nfts', 500)
__kurioMock.failNext('GET', '/api/cart', 'network')   // falha de conexão

// Sessão e carteira
__kurioMock.expireSession()       // a próxima requisição autenticada recebe 401 SESSION_EXPIRED
__kurioMock.disconnectWallets()   // a carteira encerra a sessão (evento wallet.disconnected)

// Tempo real (Socket.IO)
const ev = __kurioMock.emitNftUpdate('nft-001', { price: '1.35' })
__kurioMock.emitNftUpdate('nft-001', { editions: { '1/50': 0 } })  // edição esgotada
__kurioMock.replayEvent(ev)       // evento duplicado/antigo (deve ser ignorado)
__kurioMock.replayOrderEvent(evPedido)
__kurioMock.dropConnections()     // derruba o socket; o cliente reconecta e reconcilia via REST
__kurioMock.getConnections()      // conexões abertas e o usuário de cada uma

// Reset
__kurioMock.resetCart()
__kurioMock.resetOrders()
__kurioMock.resetScenario()
__kurioMock.resetFailures()
__kurioMock.resetAll()            // carrinhos, pedidos, cenário, falhas, usuários e sessões
```

Depois de `resetAll()`, recarregue a página. Para voltar a um estado totalmente limpo, também dá para limpar o `localStorage` do site: todas as chaves usam o prefixo `kurio:`.

Alterações feitas por `emitNftUpdate` mudam os próprios fixtures em memória. Assim, a API REST e os eventos ficam consistentes até o próximo refresh, quando o catálogo volta ao estado inicial.

## Reproduzindo os fluxos de falha

Entre com `nova@kurio.app` / `Kurio@123` antes dos cenários que exigem login.

| Cenário | Como reproduzir | Resultado esperado |
| --- | --- | --- |
| Resultado vazio | Busque por `zzzz` no catálogo | Estado vazio com opção de limpar filtros |
| Carregamento lento | `setScenario({ networkLatencyMs: 2000 })` e recarregue | Skeletons com shimmer no catálogo, detalhe e carrinho |
| Falha de listagem | `failNext('GET', '/api/nfts', 500)` três vezes (a consulta tenta 3 vezes) e mude um filtro | Mensagem de erro com "Tentar novamente" |
| Sem conexão | `failNext('GET', '/api/cart', 'network')` três vezes e abra o carrinho | Erro de carregamento com "Tentar novamente" |
| NFT inexistente | Acesse `/nft/nao-existe` | Página de NFT não encontrado |
| Rota inexistente | Acesse `/qualquer-coisa` | Página 404 |
| Favorito com falha | `failNext('PUT', '/api/favorites', 503)` e favorite um NFT | O coração muda na hora, volta ao estado anterior e um toast avisa |
| Conflito de cadastro | Cadastre `nova@kurio.app` ou o usuário `nova.kurio` | Erro no campo (`EMAIL_TAKEN` / `USERNAME_TAKEN`) |
| Credencial inválida | Login com senha errada | "E-mail ou senha incorretos." |
| Sessão expirada | `expireSession()` e navegue ou envie um formulário | Volta ao login com aviso. Na mesma conta, o rascunho do checkout é retomado |
| Cupom inválido/expirado | Aplique `XYZ` ou `LANCAMENTO` no carrinho | Erro no campo do cupom |
| Limite de quantidade | Aumente a quantidade além do disponível | Erro `INSUFFICIENT_AVAILABILITY` e atalho para ajustar |
| Preço alterado durante a compra | Com `nft-001` no carrinho, abra o pagamento e rode `emitNftUpdate('nft-001', { price: '1.35' })` | Aviso de alteração, resumo atualizado e nova confirmação obrigatória |
| Edição esgotada | `emitNftUpdate('nft-001', { editions: { '1/50': 0 } })` com o item no carrinho | Item sinalizado e checkout bloqueado até ajustar |
| Carteira recusa | `setScenario({ walletConnection: 'reject' })` e confirme o pedido | Mensagem de recusa, carrinho preservado |
| Carteira desconecta | Na revisão, `disconnectWallets()` e confirme | Pede para conectar de novo |
| Pagamento recusado | `setScenario({ payment: 'reject' })` e confirme | Pedido recusado, itens continuam no carrinho |
| Timeout com recuperação | `setScenario({ orderResponseDelayMs: 10000 })` e confirme | O cliente reenvia com a mesma `Idempotency-Key` e recupera o mesmo pedido, sem duplicar |
| Clique repetido | Clique várias vezes em confirmar | Um único pedido |
| Queda durante pedido pendente | `setScenario({ paymentDelayMs: 15000 })`, confirme, rode `dropConnections()` ou recarregue a página | O pedido pendente é retomado e chega à confirmação/recusa sem nova compra |
| Evento duplicado/antigo | `replayEvent(ev)` com um evento já aplicado | Nada muda (versão já conhecida) |

## Testes E2E

```bash
npx playwright install chromium   # primeira vez
npm run test:e2e
npm run test:e2e:report           # relatório HTML (traces, vídeos e screenshots das falhas)
```

Os testes ficam em `tests/e2e` e rodam no Chromium em dois projetos: desktop (1440×900) e mobile (390×844). Cada teste parte de um contexto novo, com `localStorage`, service worker e estado dos mocks isolados.

- **REST:** as requisições passam pelos handlers MSW.
- **Tempo real:** os eventos saem do servidor Socket.IO simulado e chegam pelo `socket.io-client` da aplicação.
- **Controle dos cenários:** latência, falhas, eventos e relógio são controlados pelos testes (`window.__kurioMock` e `page.clock`).

| Arquivo | Cobertura |
| --- | --- |
| `01-catalog` | Busca, filtros combinados, ordenação, paginação, URL, histórico e refresh |
| `02-detail` | Acesso direto, NFT inexistente, rota inexistente, edição esgotada e limite de quantidade |
| `03-auth` | Cadastro com validação e conflito, login, retorno ao fluxo, expiração (inclusive no checkout e por relógio), logout e troca de usuário |
| `04-favorites` | Persistência, falha de mutation com rollback e nova tentativa |
| `05-cart` | Quantidades, remoção, cupom, valores da API, refresh, login e falha com rollback |
| `06-purchase` | Compra completa do catálogo ao recibo confirmado |
| `07-payment-failures` | Pagamento recusado, carteira recusada ou desconectada, clique repetido, timeout com recuperação e conflito de idempotência |
| `08-profile` | Perfil, avatar, senha e carteiras com erros de validação e da API |
| `09-realtime-checkout` | Preço e disponibilidade alterados via Socket.IO no carrinho e no checkout |
| `10-realtime-resilience` | Eventos duplicados ou antigos, reconexão com reconciliação e retomada de pedido pendente |
| `11-keyboard-a11y` | Teclado, foco em diálogos, validação acessível e ausência de overflow horizontal |
| `12-loading-errors` | Skeletons com carregamento lento, falhas HTTP e de conexão e recuperação |
| `visual` | Regressão visual de início, detalhe, carrinho e pagamento (desktop e mobile) |

As baselines visuais ficam em `tests/e2e/visual.spec.ts-snapshots/`, separadas por projeto e sistema operacional. As versionadas foram geradas no Windows. Em outro sistema, gere as próprias com `npm run test:e2e:update`, porque a renderização de fontes muda entre plataformas.

## Auditoria Lighthouse

Início e Detalhe do NFT, em mobile e desktop, com mediana de 3 medições:

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | mobile | 87 | 100 | 100 | 100 |
| Detalhe do NFT | mobile | 88 | 100 | 100 | 100 |
| Início | desktop | 100 | 100 | 100 | 100 |
| Detalhe do NFT | desktop | 100 | 100 | 100 | 100 |

A Performance mobile fica abaixo de 90 por causa do ambiente simulado da demonstração. A camada de mocks precisa carregar antes da primeira renderização, e a API simulada tem latência. A análise completa, com LCP, CLS e TBT, está em [lighthouse/ANALYSIS.md](lighthouse/ANALYSIS.md). Os números de cada execução ficam em [lighthouse/RESULTS.md](lighthouse/RESULTS.md) e os relatórios HTML e JSON em `lighthouse/reports/`.

## Rotas

| Rota | Tela | Login |
| --- | --- | --- |
| `/` | Início (destaques e catálogo; filtros na URL) | — |
| `/nft/$nftId` | Detalhes do NFT | — |
| `/carrinho` | Carrinho | — |
| `/login`, `/cadastro` | Autenticação (página no mobile; no desktop abre como modal) | — |
| `/pagamento` | Pagamento | ✔ |
| `/pedido/$orderId` | Confirmação do pedido | ✔ |
| `/explorador/tx/$hash` | Explorador de blocos simulado | — |
| `/perfil` | Dados do perfil, avatar e senha | ✔ |
| `/perfil/carteiras` | Carteiras principal e secundária | ✔ |
| `/perfil/lista-de-interesse` | NFTs favoritados | ✔ |

`/mercado`, `/carteiras` e `/favoritos` redirecionam para as rotas acima.

## Deploy

É uma SPA estática. A hospedagem precisa:

1. Rodar o build com `VITE_ENABLE_MSW=true`, para os mocks e o tempo real funcionarem na versão publicada.
2. Reescrever todas as rotas para `index.html`, para o acesso direto e o refresh funcionarem.
3. Servir `mockServiceWorker.js` na raiz.

## Estrutura

```
src/
  components/   layout, auth, checkout, ícones e componentes shadcn/ui (ui/)
  pages/        uma página por rota (profile/ agrupa a área do colecionador)
  hooks/        TanStack Query (consultas, mutations e sincronização em tempo real)
  lib/          cliente Axios, sessão, Socket.IO, regras de validação e utilitários de ETH
  router/       árvore de rotas, validação de search params e proteção de rotas
  mocks/        handlers MSW (REST + Socket.IO), fixtures, cenários e controles
  types/        contratos compartilhados entre mocks, estado e interface
```
