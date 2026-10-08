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
| `npm run test:e2e` | Testes Playwright (sobe o `npm run dev` automaticamente) |
| `npm run test:e2e:ui` | Playwright em modo interativo |

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

// Falhas HTTP: a próxima requisição que casar com método + caminho recebe o status
__kurioMock.failNext('PUT', '/api/favorites', 503)
__kurioMock.failNext('GET', '/api/nfts', 500)

// Sessão e carteira
__kurioMock.expireSession()       // a próxima requisição autenticada recebe 401 SESSION_EXPIRED
__kurioMock.disconnectWallets()   // a carteira encerra a sessão (evento wallet.disconnected)

// Tempo real (Socket.IO)
const ev = __kurioMock.emitNftUpdate('nft-001', { price: '1.35' })
__kurioMock.emitNftUpdate('nft-001', { editions: { '1/50': 0 } })  // edição esgotada
__kurioMock.replayEvent(ev)       // evento duplicado/antigo (deve ser ignorado)
__kurioMock.replayOrderEvent(evPedido)
__kurioMock.dropConnections()     // derruba o socket; o cliente reconecta e reconcilia via REST

// Reset
__kurioMock.resetCart()
__kurioMock.resetOrders()
__kurioMock.resetScenario()
__kurioMock.resetAll()            // carrinhos, pedidos, cenário, usuários e sessões
```

Depois de `resetAll()`, recarregue a página. Para voltar a um estado totalmente limpo, também dá para limpar o `localStorage` do site: todas as chaves usam o prefixo `kurio:`.

Alterações feitas por `emitNftUpdate` mudam os próprios fixtures em memória. Assim, a API REST e os eventos ficam consistentes até o próximo refresh, quando o catálogo volta ao estado inicial.

## Reproduzindo os fluxos de falha

Entre com `nova@kurio.app` / `Kurio@123` antes dos cenários que exigem login.

| Cenário | Como reproduzir | Resultado esperado |
| --- | --- | --- |
| Resultado vazio | Busque por `zzzz` no catálogo | Estado vazio com opção de limpar filtros |
| Falha de listagem | `failNext('GET', '/api/nfts', 500)` e mude um filtro | Mensagem de erro com "Tentar novamente" |
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
