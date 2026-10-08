/*
 * Auditoria Lighthouse: build de demonstração (mocks ativos) + vite preview,
 * 3 medições por página e perfil, mediana por categoria e métrica.
 *
 * Uso: npm run audit            (gera o build e audita)
 *      npm run audit -- --skip-build
 * Saída: lighthouse/reports/ (HTML/JSON da medição mediana), lighthouse/summary.json e lighthouse/RESULTS.md
 */
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { chromium } from '@playwright/test'
import { BASE_URL, CATEGORIES, CHROME_FLAGS, METRICS, PAGES, PORT, PROFILES, RUNS, TARGETS } from '../lighthouse/config.mjs'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'lighthouse')
const REPORTS = path.join(OUT, 'reports')
const skipBuild = process.argv.includes('--skip-build')

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function run(command, env = {}) {
  execSync(command, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } })
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Servidor não respondeu em ${url}`)
}

function startPreview() {
  const child = spawn(`npx vite preview --port ${PORT} --strictPort`, {
    cwd: ROOT,
    shell: true,
    stdio: 'ignore',
  })
  return child
}

function stopPreview(child) {
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
    } catch {
      // já encerrado
    }
  } else {
    child.kill('SIGTERM')
  }
}

async function audit(url, profile) {
  const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: CHROME_FLAGS })
  try {
    const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, PROFILES[profile])
    if (!result) throw new Error('Lighthouse não retornou resultado')
    return result
  } finally {
    await chrome.kill()
  }
}

function summarize(lhr) {
  const scores = Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]))
  const metrics = Object.fromEntries(Object.keys(METRICS).map((id) => [id, lhr.audits[id]?.numericValue ?? null]))
  return { scores, metrics }
}

const fmtMetric = (id, value) => {
  if (value === null) return '—'
  if (id === 'cumulative-layout-shift') return value.toFixed(3)
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
}

async function main() {
  if (!skipBuild) run('npm run build:demo')
  fs.rmSync(REPORTS, { recursive: true, force: true })
  fs.mkdirSync(REPORTS, { recursive: true })

  const server = startPreview()
  let chromeVersion = ''
  const results = []
  try {
    await waitForServer(BASE_URL)
    for (const profile of Object.keys(PROFILES)) {
      for (const page of PAGES) {
        const runs = []
        for (let i = 1; i <= RUNS; i++) {
          process.stdout.write(`[${profile}] ${page.label} — medição ${i}/${RUNS}… `)
          const result = await audit(`${BASE_URL}${page.path}`, profile)
          chromeVersion ||= result.lhr.environment.hostUserAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? ''
          const summary = summarize(result.lhr)
          runs.push({ ...summary, report: result.report })
          console.log(CATEGORIES.map((c) => `${c}: ${summary.scores[c]}`).join(' · '))
        }

        const medianScores = Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))]))
        const medianMetrics = Object.fromEntries(
          Object.keys(METRICS).map((id) => [id, median(runs.map((r) => r.metrics[id] ?? 0))]),
        )
        // Relatório completo da medição mediana em performance
        const representative = [...runs].sort((a, b) => a.scores.performance - b.scores.performance)[Math.floor(RUNS / 2)]
        const base = `${page.name}-${profile}`
        fs.writeFileSync(path.join(REPORTS, `${base}.report.html`), representative.report[0])
        fs.writeFileSync(path.join(REPORTS, `${base}.report.json`), representative.report[1])

        results.push({
          page: page.label,
          path: page.path,
          profile,
          median: { scores: medianScores, metrics: medianMetrics },
          runs: runs.map(({ scores, metrics }) => ({ scores, metrics })),
          reports: { html: `reports/${base}.report.html`, json: `reports/${base}.report.json` },
        })
      }
    }
  } finally {
    stopPreview(server)
  }

  const environment = {
    date: new Date().toISOString(),
    lighthouse: require('lighthouse/package.json').version,
    chrome: chromeVersion,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: `${os.cpus()[0]?.model.trim()} × ${os.cpus().length}`,
    memory: `${Math.round(os.totalmem() / 1024 ** 3)} GB`,
    server: `vite preview (npm run build:demo: build de produção com VITE_ENABLE_MSW=true) em ${BASE_URL}`,
    runs: RUNS,
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ environment, targets: TARGETS, results }, null, 2) + '\n')
  fs.writeFileSync(path.join(OUT, 'RESULTS.md'), renderMarkdown(environment, results))
  console.log('\nResultados em lighthouse/RESULTS.md')
}

function renderMarkdown(env, results) {
  const label = { performance: 'Performance', accessibility: 'Accessibility', 'best-practices': 'Best Practices', seo: 'SEO' }
  const mark = (c, v) => (v >= TARGETS[c] ? `${v}` : `**${v}** ⚠️`)
  const lines = [
    '# Resultados Lighthouse',
    '',
    '> Gerado por `npm run audit` — não editar à mão. Análise em [ANALYSIS.md](ANALYSIS.md).',
    '',
    `Mediana de ${env.runs} medições por página e perfil. Metas: ${CATEGORIES.map((c) => `${label[c]} ≥ ${TARGETS[c]}`).join(', ')}.`,
    '',
    `| Página | Perfil | ${CATEGORIES.map((c) => label[c]).join(' | ')} | ${Object.values(METRICS).join(' | ')} |`,
    `| --- | --- | ${CATEGORIES.map(() => '---:').join(' | ')} | ${Object.values(METRICS).map(() => '---:').join(' | ')} |`,
    ...results.map(
      (r) =>
        `| ${r.page} | ${r.profile} | ${CATEGORIES.map((c) => mark(c, r.median.scores[c])).join(' | ')} | ${Object.keys(METRICS)
          .map((id) => fmtMetric(id, r.median.metrics[id]))
          .join(' | ')} |`,
    ),
    '',
    '## Medições individuais',
    '',
    '| Página | Perfil | Medição | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...results.flatMap((r) =>
      r.runs.map(
        (run, i) =>
          `| ${r.page} | ${r.profile} | ${i + 1} | ${CATEGORIES.map((c) => run.scores[c]).join(' | ')} | ${['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time']
            .map((id) => fmtMetric(id, run.metrics[id]))
            .join(' | ')} |`,
      ),
    ),
    '',
    '## Relatórios',
    '',
    ...results.map((r) => `- ${r.page} (${r.profile}): [HTML](${r.reports.html}) · [JSON](${r.reports.json})`),
    '',
    '## Ambiente e condições',
    '',
    `- Data: ${env.date}`,
    `- Lighthouse ${env.lighthouse} · Chromium ${env.chrome} (Playwright, headless) · Node ${env.node}`,
    `- Sistema: ${env.os} · CPU: ${env.cpu} · Memória: ${env.memory}`,
    `- Servidor: ${env.server}`,
    '- Mobile: configuração padrão do Lighthouse (Moto G Power emulado, 4G lento e CPU 4× simulados)',
    '- Desktop: `desktop-config` oficial do Lighthouse (1350×940, rede rápida simulada, sem limitação de CPU)',
    '- Cada medição usa um perfil novo do navegador (sem cache, service worker registrado do zero)',
    '',
  ]
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
