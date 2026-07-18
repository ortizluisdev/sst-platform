/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), compression({ algorithms: ['gzip', 'brotliCompress'] })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['node_modules', 'dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Anchored to `node_modules/vue/` specifically — a loose `/vue/` match would
          // also catch unrelated packages like `@unhead/vue` (its own folder is named "vue").
          if (/node_modules\/(vue|vue-router|pinia)\//.test(id)) return 'vendor-vue'
          if (/[\\/](vee-validate|@vee-validate|zod)[\\/]/.test(id)) return 'vendor-forms'
          if (/[\\/]axios[\\/]/.test(id)) return 'vendor-http'
          if (/[\\/]vue-i18n[\\/]/.test(id)) return 'vendor-i18n'
          if (/[\\/]@unhead[\\/]/.test(id)) return 'vendor-head'
        },
      },
    },
  },
})
