import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async () => ({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/components/ui', import.meta.url)),
      '@motion': fileURLToPath(new URL('./src/motion', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          // Cleanly split heavy vendor groups so initial bundle stays lean.
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          firebase: ['firebase'],
          pdf: ['pdfjs-dist'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // Bundle visualizer only when ANALYZE=1 so devs don't pay the dep cost
    // on every build. To use: `npm i -D rollup-plugin-visualizer && npm run analyze`.
    ...(process.env.ANALYZE
      ? [
          // Indirect dynamic import so Rollup doesn't statically analyze and
          // warn when the plugin isn't installed. To use:
          // `npm i -D rollup-plugin-visualizer && npm run analyze`
          (await new Function('s', 'return import(s)')('rollup-plugin-visualizer'))
            .visualizer({
              filename: 'dist/bundle-report.html',
              gzipSize: true,
              brotliSize: true,
              open: true,
            }),
        ]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'REE.ai Tactical Reviewer',
        short_name: 'REE.ai',
        description: 'Philippine REE Board Exam Predictive Analytics & Active Review Engine',
        theme_color: '#0a0f1e',
        background_color: '#0a0f1e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Caches all core structural files for offline UI rendering
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ],
}));