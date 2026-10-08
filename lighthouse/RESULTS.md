# Resultados Lighthouse

> Gerado por `npm run audit` — não editar à mão. Análise em [ANALYSIS.md](ANALYSIS.md).

Mediana de 3 medições por página e perfil. Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | Speed Index |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | **87** ⚠️ | 100 | 100 | 100 | 3.68 s | 0.000 | 91 ms | 2.26 s | 2.64 s |
| Detalhe do NFT | mobile | **88** ⚠️ | 100 | 100 | 100 | 3.62 s | 0.000 | 60 ms | 1.98 s | 2.70 s |
| Início | desktop | 100 | 100 | 100 | 100 | 790 ms | 0.000 | 2 ms | 477 ms | 631 ms |
| Detalhe do NFT | desktop | 100 | 100 | 100 | 100 | 748 ms | 0.000 | 0 ms | 464 ms | 640 ms |

## Medições individuais

| Página | Perfil | Medição | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 1 | 87 | 100 | 100 | 100 | 3.68 s | 0.000 | 91 ms |
| Início | mobile | 2 | 86 | 100 | 100 | 100 | 3.70 s | 0.000 | 101 ms |
| Início | mobile | 3 | 87 | 100 | 100 | 100 | 3.68 s | 0.000 | 77 ms |
| Detalhe do NFT | mobile | 1 | 87 | 100 | 100 | 100 | 3.62 s | 0.000 | 60 ms |
| Detalhe do NFT | mobile | 2 | 88 | 100 | 100 | 100 | 3.63 s | 0.000 | 91 ms |
| Detalhe do NFT | mobile | 3 | 88 | 100 | 100 | 100 | 3.62 s | 0.000 | 53 ms |
| Início | desktop | 1 | 100 | 100 | 100 | 100 | 790 ms | 0.000 | 2 ms |
| Início | desktop | 2 | 100 | 100 | 100 | 100 | 808 ms | 0.000 | 2 ms |
| Início | desktop | 3 | 100 | 100 | 100 | 100 | 753 ms | 0.000 | 1 ms |
| Detalhe do NFT | desktop | 1 | 100 | 100 | 100 | 100 | 745 ms | 0.000 | 0 ms |
| Detalhe do NFT | desktop | 2 | 100 | 100 | 100 | 100 | 756 ms | 0.000 | 0 ms |
| Detalhe do NFT | desktop | 3 | 100 | 100 | 100 | 100 | 748 ms | 0.000 | 0 ms |

## Relatórios

- Início (mobile): [HTML](reports/inicio-mobile.report.html) · [JSON](reports/inicio-mobile.report.json)
- Detalhe do NFT (mobile): [HTML](reports/detalhe-mobile.report.html) · [JSON](reports/detalhe-mobile.report.json)
- Início (desktop): [HTML](reports/inicio-desktop.report.html) · [JSON](reports/inicio-desktop.report.json)
- Detalhe do NFT (desktop): [HTML](reports/detalhe-desktop.report.html) · [JSON](reports/detalhe-desktop.report.json)

## Ambiente e condições

- Data: 2026-10-08T13:10:45.695Z
- Lighthouse 13.5.0 · Chromium 153.0.0.0 (Playwright, headless) · Node v24.13.1
- Sistema: Windows_NT 10.0.19045 (x64) · CPU: AMD Ryzen 5 5600G with Radeon Graphics × 12 · Memória: 39 GB
- Servidor: vite preview (build de produção, VITE_ENABLE_MSW=true) em http://localhost:4173
- Mobile: configuração padrão do Lighthouse (Moto G Power emulado, 4G lento e CPU 4× simulados)
- Desktop: `desktop-config` oficial do Lighthouse (1350×940, rede rápida simulada, sem limitação de CPU)
- Cada medição usa um perfil novo do navegador (sem cache, service worker registrado do zero)
