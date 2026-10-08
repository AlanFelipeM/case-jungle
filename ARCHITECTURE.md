# Arquitetura

Este documento descreve como a aplicação é organizada:
- os contratos REST e de eventos;
- as políticas de sessão, carrinho e cache;
- a reconciliação entre REST e Socket.IO;
- as limitações do ambiente de mocks;
- os desvios em relação ao layout.

## Visão geral

```
UI (pages/components)
  │  lê e altera dados apenas via hooks
  ▼
hooks/ (TanStack Query) ──────── useRealtimeSync ◄── socket.io-client (lib/realtime.ts)
  │  queries, mutations, cache          │ setQueryData / invalidateQueries
  ▼                                     │
lib/api.ts (Axios: baseURL /api, token, timeout 8s, 401 → sessão expirada)
  │                                     │
  ▼                                     ▼
MSW (mocks/handlers) ── REST + servidor Socket.IO simulado (@mswjs/socket.io-binding)
  │
  ▼
estado dos mocks (fixtures em memória + localStorage com prefixo kurio:mock:)
```

- **Componentes e hooks não têm dados fictícios.** Toda resposta vem da camada de rede, onde o MSW intercepta `/api/*` e o WebSocket do Socket.IO.
- **Contratos em um lugar só.** Os tipos de `src/types` são compartilhados entre os handlers, os hooks e a interface. As regras de validação (`lib/account.ts`, `lib/checkout.ts`) são as mesmas no formulário e no handler, então cliente e "servidor" nunca divergem.
- **Mocks só por configuração.** `main.tsx` carrega o MSW apenas em `dev` ou com `VITE_ENABLE_MSW=true`. No build sem a flag, o código dos mocks não é carregado.

## Contratos REST

Base: `/api`. As rotas autenticadas usam `Authorization: Bearer <token>`. Todo erro segue o mesmo formato:

```ts
{ error: string; code: string; fieldErrors?: Record<string, string>; ...extras }
```

| Status | `code` | Significado |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Requisição sem sessão em recurso privado |
| 401 | `SESSION_EXPIRED` | Token expirado ou inexistente |
| 401 | `INVALID_CREDENTIALS` | Login inválido (mesma resposta para e-mail inexistente e senha errada) |
| 403 | `WALLET_REJECTED` | Usuário recusou a conexão na carteira |
| 404 | `NOT_FOUND` | Recurso inexistente. Um pedido de outro usuário também responde 404, para não revelar que ele existe |
| 409 | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `WALLET_DUPLICATED` | Conflito de cadastro |
| 409 | `EDITION_UNAVAILABLE`, `INSUFFICIENT_AVAILABILITY` | Conflito de disponibilidade (com `available`) |
| 409 | `QUOTE_CHANGED` | Valores mudaram desde a revisão (com a `quote` atual) |
| 409 | `WALLET_NOT_CONNECTED` | A sessão da carteira foi encerrada |
| 409 | `IDEMPOTENCY_CONFLICT` | Chave de idempotência reutilizada com conteúdo diferente |
| 413 | `IMAGE_TOO_LARGE` | Avatar acima do limite |
| 422 | `VALIDATION_ERROR`, `COUPON_INVALID`, `COUPON_EXPIRED`, `CART_EMPTY`, `CURRENT_PASSWORD_INVALID`, `INVALID_IMAGE`, `PRIMARY_REQUIRED`, `IDEMPOTENCY_KEY_REQUIRED` | Erro de validação |
| 5xx | `TRANSIENT_ERROR` | Falha transitória (injetada por `failNext`) |
| 501 | `NOT_AVAILABLE` | Ação fora do escopo da demonstração (newsletter) |

### Sessão e conta

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ username, email, password }` | 201 `{ user, token, expiresAt }` · 409 conflito · 422 |
| POST | `/auth/login` | `{ email, password }` | 200 `{ user, token, expiresAt }` · 401 `INVALID_CREDENTIALS` · 422 |
| GET | `/auth/session` | — | 200 `{ user }` · 401 |
| POST | `/auth/logout` | — | 204. Encerra também os sockets da sessão |

Login e cadastro levam os itens do carrinho de visitante para o carrinho da conta, respeitando os limites de disponibilidade.

### NFTs

| Método | Rota | Parâmetros | Resposta |
| --- | --- | --- | --- |
| GET | `/nfts` | `search, category, network, collection, priceMin, priceMax, tab (all\|new\|trending), sort (recently-listed\|price-asc\|price-desc\|newest\|popular), page, limit` | `{ data: NFT[], total, page, limit, totalPages }` |
| GET | `/nfts/featured` | — | `NFT` |
| GET | `/nfts/:id` | — | `NFT` · 404 |
| GET | `/nfts/:id/reviews` | — | `{ items, total, average }` · 404 |
| GET | `/meta` | — | Contagem por categoria e rede |
| GET | `/banners`, `/blog` | — | Conteúdo da home |

Todo `NFT` traz um `version`, incrementado a cada alteração. Os preços são **strings decimais em ETH** (`"1.25"`), assim como todos os valores monetários da API.

### Favoritos

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/favorites` | `string[]` (ids) |
| PUT | `/favorites/:nftId` | `string[]` atualizada · 404 |
| DELETE | `/favorites/:nftId` | `string[]` atualizada |
| GET | `/favorites/nfts` | `NFT[]` da lista de interesse |

### Carrinho e cotação

As rotas aceitam visitante (carrinho `guest`) ou usuário autenticado (carrinho próprio). Um token expirado recebe 401.

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/cart` | — | `Cart` com dados atuais do catálogo |
| POST | `/cart/items` | `{ nftId, editionId, quantity }` | 201 `Cart` · 404 · 409 disponibilidade · 422 |
| PATCH | `/cart/items/:id` | `{ quantity }` | `Cart` · 409 (só ao aumentar acima do disponível) · 404 |
| DELETE | `/cart/items/:id` | — | `Cart` · 404 |
| POST | `/cart/coupon` | `{ code }` | `Cart` · 422 inválido/expirado/carrinho vazio |
| DELETE | `/cart/coupon` | — | `Cart` |
| GET | `/cart/quote` | — | `Quote` |
| POST | `/cart/confirm-prices` | — | `Cart` (o colecionador aceita os preços atuais) |

`Quote` traz:
- `lines[]`, com `unitPrice`, `total`, `previousPrice`, `priceChanged`, `available` e `exceedsAvailability`;
- `subtotal`, `discount`, `networkFee`, `total`;
- `coupon`, `couponValid`, `hasIssues`;
- `expiresAt`.

**A cotação da API é a referência do valor.** O cliente não recalcula totais. As contas no mock usam BigInt em wei (`lib/eth.ts`), então não há perda de precisão.

### Carteira e pedidos

| Método | Rota | Corpo / cabeçalhos | Resposta |
| --- | --- | --- | --- |
| POST | `/wallet/connect` | `{ connector, address, network }` | 201 `WalletSession` · 403 `WALLET_REJECTED` · 422 |
| POST | `/wallet/disconnect` | `{ sessionId }` | 204 |
| POST | `/orders` | `Idempotency-Key: <uuid>` + `CreateOrderPayload` | 201 `Order` · 200 `Order` (mesma tentativa) · 409 `QUOTE_CHANGED` / `WALLET_NOT_CONNECTED` / `IDEMPOTENCY_CONFLICT` · 422 |
| GET | `/orders/:id` | — | `Order` (estado e recibo) · 404 |

`CreateOrderPayload` envia:
- os itens com quantidade e preço unitário revisados;
- o cupom e o `expectedTotal`;
- os dados do colecionador e a carteira;
- `walletSessionId`.

O servidor revalida itens, preços, disponibilidade, cupom e total. **Qualquer diferença gera `QUOTE_CHANGED`** com a cotação nova, e o pedido não é criado.

`Order` tem:
- `status`: `pending` → `confirmed` | `rejected`. Os dois finais são terminais;
- `version`;
- o snapshot dos itens e valores;
- `transactionRef`;
- `failureReason` (na recusa).

**O recibo é um snapshot:** mudanças posteriores no catálogo não alteram o pedido.

### Perfil e carteiras

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/profile` | — | `AccountProfile` |
| PATCH | `/profile` | `{ displayName, username, profileName, email, ensName }` | `{ profile, user }` · 409 conflito · 422 |
| PUT | `/profile/avatar` | `{ image: dataURL }` (PNG/JPG/WebP, redimensionada para 256px no cliente) | `User` · 413 · 422 |
| DELETE | `/profile/avatar` | — | `User` |
| POST | `/profile/password` | `{ currentPassword, newPassword }` | 204 · 422 |
| GET | `/wallets` | — | `Wallet[]` |
| PUT | `/wallets/primary` \| `/wallets/secondary` | `WalletInput` ou `{ sameAsPrimary: true }` | `Wallet[]` · 409 `WALLET_DUPLICATED` · 422 |
| DELETE | `/wallets/secondary` | — | `Wallet[]` |

## Eventos Socket.IO

Conexão em `VITE_SOCKET_URL`, só por transporte `websocket`, com o token da sessão na query do handshake (`?token=`).

| Evento | Payload | Destinatários |
| --- | --- | --- |
| `nft.updated` | `{ id, resource: 'nft', nftId, version, price, editions: [{ id, available }], timestamp }` | Todos os clientes conectados |
| `order.updated` | `{ id, resource: 'order', orderId, status, version, timestamp }` | Apenas as conexões do dono do pedido |
| `wallet.disconnected` | `{ sessionId }` | Clientes conectados. O checkout compara com a própria sessão de carteira |

- `id` é a identidade estável do evento (deduplicação).
- `version` é a versão do recurso (ordenação).
- Os eventos são emitidos pelo mesmo código que altera o estado dos mocks: `emitNftUpdate` muda o fixture e depois emite. **REST e eventos nunca divergem.**

### Aplicação no cliente (`hooks/useRealtimeSync.ts`)

- **Duplicatas:** um `Set` de ids já vistos (limitado a 500) descarta repetições.
- **Eventos antigos:** a última versão aplicada fica guardada por recurso. `version <= última` é ignorado, e `applyNftEvent` também compara com a versão do cache, então o estado nunca regride.
- **`nft.updated`:** atualiza via `setQueryData` o detalhe, o destaque, todas as listas do catálogo, o carrossel da coleção e o carrinho. No carrinho, o `priceSnapshot` é mantido para mostrar "preço alterado". Se o NFT está no carrinho, a cotação é invalidada e recarregada da API.
- **`order.updated`:** aplica o status só se a versão for maior que a do cache e depois invalida o pedido. O recibo completo sempre vem do REST. Na confirmação, o carrinho é invalidado.
- **Reconexão:** em `reconnect`, invalida `['nfts']`, `['cart']` e `['orders']`. Eventos perdidos durante a queda são cobertos pela reconciliação com a API.
- **Ciclo de vida:**
  - a conexão é única e vinculada ao token (`lib/realtime.ts`);
  - trocar de usuário encerra o socket anterior e abre outro, então eventos de outra sessão não chegam;
  - os listeners são removidos no cleanup do efeito;
  - no logout, o servidor também derruba os sockets da sessão.

### Cenário de preço alterado no checkout

1. Um NFT está no carrinho e o usuário está no pagamento.
2. Chega um `nft.updated`: o cache é atualizado e a cotação é recarregada. `hasIssues` fica verdadeiro e a interface anuncia a alteração em uma região `aria-live`.
3. O usuário precisa aceitar os novos valores (`/cart/confirm-prices`) antes de revisar de novo.
4. Se a confirmação for enviada com a cotação antiga, `POST /orders` responde `409 QUOTE_CHANGED`. O fluxo volta para a revisão com o total anterior e o novo lado a lado.

## Sessão

- **Token:** opaco, guardado em `localStorage` (`kurio:token`). A sessão dura 1 hora (`SESSION_TTL_MS`).
- **Recuperação após refresh:** `GET /auth/session`. `useToken` usa `useSyncExternalStore` e sincroniza entre abas pelo evento `storage`.
- **Proteção de rotas:** `/pagamento`, `/pedido/$orderId` e `/perfil/*` têm `beforeLoad` no roteador. Sem token, redirecionam para `/login?redirect=<rota>`. O `redirect` só aceita caminhos internos, para evitar open redirect.
- **Expiração:** qualquer 401 em requisição autenticada limpa o token e dispara `kurio:session-expired`. O `AuthProvider`:
  - remove os dados privados do cache, mas preserva o rascunho do checkout e a tentativa de pedido;
  - em rota protegida, leva ao login com `reason=expired` e retorna à mesma tela depois;
  - em rota pública, mostra um aviso.
- **Logout e troca de usuário:** removem do cache `cart`, `profile`, `wallets`, `orders`, `favorites` e `auth`, além do rascunho do checkout e da tentativa de pedido. O socket da sessão anterior é encerrado.
  - Ao entrar de novo **na mesma conta** (depois de uma expiração), o rascunho é mantido para a retomada.
  - Ao entrar em **outra conta**, nada da sessão anterior permanece.
- **Isolamento nos mocks:** o carrinho, os favoritos, o perfil, as carteiras e os pedidos são indexados pelo usuário do token. Os eventos de pedido só vão para as conexões do dono.

## Carrinho

- **Estado no servidor (mock).** O carrinho persiste no `localStorage` por dono: `kurio:mock:cart` para o visitante e `kurio:mock:cart:<userId>` para cada conta. Por isso sobrevive a refresh.
- **Visitante → login:** os itens do visitante passam para a conta, respeitando o limite por edição (disponibilidade e no máximo 10 por pedido).
- **Quantidade e remoção** usam atualização otimista com rollback (`useCartItemMutation`):
  - cliques seguidos usam `mutationKey`, e só a última resposta grava o cache, o que evita respostas fora de ordem;
  - reduzir a quantidade é sempre permitido, mesmo quando o estoque caiu abaixo dela;
  - aumentar acima do disponível retorna 409, e a interface oferece "Ajustar para N".
- **Adicionar e cupom** gravam o carrinho devolvido pela API e invalidam a cotação.
- **Após um pedido confirmado,** o servidor remove do carrinho apenas os itens e quantidades comprados. Se o pagamento for recusado ou falhar, o carrinho fica intacto.

## Checkout, idempotência e recuperação

`hooks/useCheckoutFlow.ts` controla as fases: `idle → review → connecting → submitting → pending → (confirmed | rejected | failed)`.

- **Idempotência.** A chave é gerada por conteúdo: `attemptFor(payload)` faz o hash do payload com `stableStringify`, sem a sessão de carteira.
  - Mesmo conteúdo → mesma `Idempotency-Key`. Isso vale para clique repetido, retry automático e reenvio após timeout.
  - Conteúdo diferente → chave nova.
  - A tentativa (chave, hash e `orderId`) fica no `localStorage` (`kurio:checkout:attempt`).
- **Timeout.**
  - O Axios aborta em 8s.
  - `useCreateOrder` tenta de novo até 2 vezes, só em erro transitório (timeout, rede ou 5xx), com 800ms de intervalo.
  - O pedido já existe no servidor, então o reenvio recebe **o mesmo pedido** (200).
- **Pedido pendente:**
  - o `order.updated` é a via principal;
  - enquanto `pending`, `useOrder` também consulta a cada 5s, cobrindo eventos perdidos;
  - depois de um refresh, a tentativa salva reabre o diálogo e retoma a consulta;
  - no mock, pedidos pendentes são resolvidos no `GET` quando o prazo passou, mesmo que a aba tenha sido fechada.
- **Terminais:**
  - a tela de confirmação (`/pedido/$orderId`) só é aberta para `confirmed`;
  - `rejected` mostra o motivo e preserva o carrinho;
  - um evento ou resposta com versão menor nunca regride o estado.
- **Rascunho** dos dados do colecionador em `sessionStorage` (`kurio:checkout:draft`), para a retomada após uma expiração de sessão.

## Estado de busca na URL

Busca, filtros, ordenação, aba e página ficam nos search params da rota `/` (`q, category, network, min, max, tab, sort, page`), validados por `parseCatalogSearch`:
- valores inválidos são descartados;
- `min` e `max` invertidos são trocados;
- os valores padrão ficam fora da URL.

Mudar um filtro volta para a página 1. Os parâmetros viram a query key (`['nfts', 'list', params]`), então cada combinação tem seu próprio cache, e refresh ou voltar no histórico restauram a tela.

## Cache, retries e sincronização

Padrões globais (`main.tsx`): `staleTime: 30s`, `retry: 2`, `refetchOnWindowFocus: false`.

| Consulta | Query key | staleTime | Observações |
| --- | --- | --- | --- |
| Catálogo | `['nfts','list',params]` | 30s | `placeholderData` mantém a página anterior durante a troca |
| Detalhe | `['nfts','detail',id]` | 60s | Sem retry em 404 |
| Coleção / destaque / reviews | `['nfts',...]` | 60s | |
| Banners, blog, meta | `['banners']`, `['blog']`, `['meta']` | 5min | |
| Sessão | `['auth','session',token]` | 5min | Token na chave: troca de usuário = cache novo. Sem retry em 401 |
| Carrinho | `['cart']` | 30s | |
| Cotação | `['cart','quote']` | padrão | Invalidada após toda mutation do carrinho e em `nft.updated` de item do carrinho |
| Favoritos | `['favorites']` | 60s | Habilitada só com sessão |
| Perfil / carteiras | `['profile']`, `['wallets']` | 5min | Atualizadas via `setQueryData` com a resposta das mutations |
| Pedido | `['orders',id]` | padrão | Consulta a cada 5s enquanto `pending`; sem retry em 404 |

- **Cancelamento:** toda `queryFn` repassa o `signal` ao Axios. Uma consulta substituída (filtro novo, por exemplo) é abortada, e a resposta obsoleta é descartada.
- **Atualização otimista com rollback:**
  - favoritos (`useToggleFavorite`): `onMutate` → snapshot → `onError` restaura e avisa por toast;
  - quantidade e remoção no carrinho.
- **Invalidação:**
  - mutations gravam a resposta da API no cache (`setQueryData`) e invalidam só o que depende dela (cotação, lista de interesse);
  - eventos atualizam o cache diretamente, e a reconexão invalida tudo o que é ativo;
  - o perfil também atualiza a sessão em cache, então o nome e o avatar da navbar mudam na hora.

## Mocks (MSW)

- Os handlers ficam em `src/mocks/handlers`. `failures.ts` é registrado primeiro e só intercepta quando há uma falha agendada (`failNext`).
- **Estado persistido** (`localStorage`, prefixo `kurio:mock:`): usuários, sessões, carrinhos, pedidos e cenário.
- **Estado em memória:** catálogo, sessões de carteira e sockets.
- **Fixtures determinísticas:**
  - 239 NFTs, sendo 13 curados e o restante gerado de forma estável para bater com as contagens por categoria;
  - 9 categorias, 3 redes e edições com disponibilidade limitada e ilimitada;
  - 2 usuários semente e 3 cupons (válido, válido e expirado).
- **Latência:** 100–600ms por rota. O catálogo tem variação aleatória (+0–200ms) para exercitar respostas fora de ordem, que o cancelamento por `signal` e as query keys por parâmetro tratam.
- **Cenários reproduzíveis:** `setScenario` (carteira, pagamento, atraso do pedido e da confirmação), `failNext` (status HTTP por método e rota), `expireSession`, `disconnectWallets`, `dropConnections` e a emissão manual de eventos.
- **Reset:** `resetAll()` restaura usuários, sessões, carrinhos, pedidos e cenário. Um refresh restaura o catálogo em memória.

### Transporte Socket.IO e limitações

- O `@mswjs/socket.io-binding` intercepta o WebSocket e fala o protocolo Engine.IO/Socket.IO. O cliente é o `socket.io-client` real; nenhum evento é injetado direto no cache.
- **Só WebSocket.** O cliente usa `transports: ['websocket']`, porque o binding não simula o long-polling HTTP.
- **Carregamento tardio.** O `socket.io-client` guarda a referência de `WebSocket` ao ser importado, por isso é carregado com `import()` depois que o MSW inicia.
- **Heartbeat.** O mock envia o ping do Engine.IO a cada 20s; sem ele, o cliente reconectaria por timeout.
- **Autenticação.** Vai pela query do handshake (`?token=`), não pelo payload `auth`.
- **Escopo por aba.** O "servidor" roda dentro da aba: eventos emitidos em uma aba não chegam a outras, e o catálogo alterado volta ao estado inicial após um refresh.
- **Temporizadores.** Os pedidos pendentes são resolvidos por `setTimeout` na aba. Se ela for fechada, o próximo `GET /orders/:id` resolve o pedido.

## Acessibilidade

- Os diálogos e drawers (Radix) prendem o foco e o devolvem ao fechar.
- O foco fica visível em todos os controles, e `cursor: pointer` foi restaurado nos elementos clicáveis (o Tailwind v4 removeu o padrão).
- Os erros são associados aos campos (`aria-invalid` + `aria-describedby`), e o foco vai para o primeiro campo inválido.
- Mutations e eventos em tempo real dão retorno via toast e regiões `aria-live`.
- Os estados não dependem só de cor: há texto ou ícone junto (esgotado, preço alterado, erro).
- Os skeletons com shimmer reservam as dimensões do conteúdo e respeitam `prefers-reduced-motion`.

## Desvios do layout e decisões de UX

- **Login e cadastro:** abrem em modal no desktop e tablet, mantendo o contexto da página, e viram página (`/login`, `/cadastro`) no mobile. O "Esqueceu a senha" e o login social mostram que não estão disponíveis nesta demonstração, em vez de simular sucesso.
- **Conta de demonstração:** foi adicionado no login um atalho que preenche credenciais fictícias. Ele não existe no layout.
- **Perfil, carteiras e confirmação no mobile:** não há frame específico. O layout mobile segue os mesmos componentes, e a navegação do perfil vira uma faixa rolável de seções.
- **Seções fora do escopo:** Atividade, Ofertas, Arquivos baixados, Suporte, páginas editoriais e newsletter mostram um estado informativo, sem simular funcionamento. A newsletter valida o e-mail e responde 501 `NOT_AVAILABLE`.
- **Explorador de blocos:** o link da transação abre um explorador simulado interno (`/explorador/tx/$hash`), porque a referência de transação é fictícia.
- **Avatar:** o "Remover" fica sempre visível e desabilitado quando não há avatar.
- **Estados não desenhados:** foram criados seguindo o mesmo padrão visual: vazio, erro, carregamento, preço alterado, edição esgotada, pedido pendente e recusado, sessão expirada e 404. O carrinho ganhou o aviso de alteração e o atalho "Ajustar para N".
- **Leitura de QR code:** a busca mobile abre a câmera (`qr-scanner`) e aceita apenas links de NFT da própria aplicação. O id é extraído e nenhuma URL externa é aberta.
- **Assets:**
  - as imagens dos NFTs foram exportadas do arquivo e convertidas para WebP em duas larguras (480 e 900), para performance;
  - os ícones foram exportados em SVG e convertidos em componentes com `currentColor`;
  - alguns ícones utilitários (setas, fechar, olho) vêm do `lucide-react`;
  - a fonte Roboto Mono é servida localmente via `@fontsource-variable`.
