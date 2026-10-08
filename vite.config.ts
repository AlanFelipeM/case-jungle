import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/** Bibliotecas agrupadas em chunks estáveis: baixam em paralelo e ficam em cache entre deploys */
const VENDOR_CHUNKS: Record<string, RegExp> = {
  react: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
  tanstack: /node_modules[\\/]@tanstack[\\/]/,
  ui: /node_modules[\\/](@radix-ui|@floating-ui|react-remove-scroll|react-remove-scroll-bar|react-style-singleton|use-callback-ref|use-sidecar|aria-hidden|tailwind-merge|clsx|class-variance-authority)[\\/]/,
  http: /node_modules[\\/](axios)[\\/]/,
  // A camada de mocks não é agrupada à mão: ela compartilha módulos com a aplicação (tipos,
  // regras de validação) e um chunk manual a tornaria dependência estática do app
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return Object.keys(VENDOR_CHUNKS).find((name) => VENDOR_CHUNKS[name].test(id))
        },
      },
    },
  },
})
