import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/DollarYen/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'DollarYen',
        short_name: 'DollarYen',
        id: './',
        lang: 'ja',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: '#edf1f5',
        background_color: '#edf1f5',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html}'],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
