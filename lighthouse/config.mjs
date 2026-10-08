/*
 * Configuração da auditoria Lighthouse (versionada).
 * Build otimizado com os mocks ativos (cenário padrão), servido pelo `vite preview`.
 */
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

export const PORT = 4173
export const BASE_URL = `http://localhost:${PORT}`

/** Páginas auditadas (README §10) */
export const PAGES = [
  { name: 'inicio', label: 'Início', path: '/' },
  { name: 'detalhe', label: 'Detalhe do NFT', path: '/nft/nft-001' },
]

/** Medições por página e perfil; o relatório usa a mediana */
export const RUNS = 3

export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

/** Metas por categoria (0–100) */
export const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

/** Métricas registradas além das categorias */
export const METRICS = {
  'largest-contentful-paint': 'LCP',
  'cumulative-layout-shift': 'CLS',
  'total-blocking-time': 'TBT',
  'first-contentful-paint': 'FCP',
  'speed-index': 'Speed Index',
}

const settings = { onlyCategories: CATEGORIES }

/**
 * Perfis: mobile usa o padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4×);
 * desktop usa a configuração oficial de desktop (sem emulação móvel, rede rápida simulada).
 */
export const PROFILES = {
  mobile: { extends: 'lighthouse:default', settings },
  desktop: { ...desktopConfig, settings: { ...desktopConfig.settings, ...settings } },
}

/** Flags do Chrome (perfil limpo a cada medição) */
export const CHROME_FLAGS = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions']
