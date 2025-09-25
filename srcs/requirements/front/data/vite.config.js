import { defineConfig } from 'vite'
import tailwindcssPostcss from '@tailwindcss/postcss'

export default defineConfig({
  plugins: [],
  root: 'src/public',
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/public/index.html'
    }
  },
  server: {
    port: 5173,
    host: true
  },
  css: {
    postcss: {
      plugins: [
        tailwindcssPostcss,
      ]
    }
  }
})
