import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    compression({ algorithms: ['gzip', 'brotliCompress'] }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/](vue|vue-router|pinia)[\\/]/.test(id)) return 'vendor-vue'
          if (/[\\/](vee-validate|@vee-validate|zod)[\\/]/.test(id)) return 'vendor-forms'
          if (/[\\/]axios[\\/]/.test(id)) return 'vendor-http'
        },
      },
    },
  },
})
