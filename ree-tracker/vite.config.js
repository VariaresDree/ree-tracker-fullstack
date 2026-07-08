import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async () => ({
  // Vitest config. Default environment is jsdom so React component tests can
  // mount; pure-function suites can opt back to node via a per-file
  // `// @vitest-environment node` pragma if they want the speed (but jsdom
  // overhead is ~30ms once for the whole run, so it's rarely worth it).
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    setupFiles: ['./src/test/setup.js'],
    globals: false,
    css: false,
  },
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
        // Cleanly split heavy vendor groups so initial bundle stays lean.
        // Rolldown (Vite 8) requires the function form of manualChunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router-dom') || /[\\/]react(-dom)?[\\/]/.test(id)) return 'react';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('pdfjs-dist')) return 'pdf';
          if (id.includes('socket.io-client')) return 'socket';
          return undefined;
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
        // APP SHELL (JS/CSS/HTML/icons/fonts): precached, i.e. CacheFirst with
        // revision-based invalidation — the shell must boot with zero network.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Raise the precache size cap above Workbox's 2 MiB default: the heavy
        // vendor chunks (charts/recharts, LatexRenderer/KaTeX, jspdf, pdfjs) can
        // approach it, and any chunk over the cap is SILENTLY excluded from the
        // precache manifest — which breaks the offline app-shell boot. 5 MiB
        // leaves headroom without precaching anything unreasonable.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Explicit per-resource-type runtime strategies (not one blanket policy):
        runtimeCaching: [
          {
            // API content JSON (questions / reference / metadata / config): feels
            // LIVE when online, degrades to cache when the network is slow/absent.
            urlPattern: ({ url }) => /\/api\/(questions|reference|metadata|config)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-content',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Question / explanation images: cache-first with a bounded, expiring
            // cache so storage can't grow without limit on a low-end device.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts CSS + font files (loaded from index.html) so typography
            // survives offline first-loads instead of falling back to system fonts.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      }
    })
  ],
}));