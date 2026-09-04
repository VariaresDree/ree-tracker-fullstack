import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async ({ mode, command }) => {
  // VITE_* values are INLINED at build time, so a missing VITE_BACKEND_URL does
  // not fail — it silently ships a production bundle pointing at
  // http://localhost:5000. Every request then dies as a mixed-content or
  // connection error, the circuit breaker trips, and the app reports itself as
  // "[OFFLINE]" with nothing anywhere indicating it is a configuration problem.
  //
  // Fail the build instead. A red deploy naming the missing variable is far
  // cheaper than a green deploy of an app that cannot reach its API.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build' && mode === 'production' && !env.VITE_BACKEND_URL) {
    throw new Error(
      'VITE_BACKEND_URL is not set. A production build without it inlines '
      + 'http://localhost:5000 as the API origin and ships an app that cannot '
      + 'reach its backend. Set it in the Vercel project environment.',
    );
  }

  return {
  // @ree/shared holds the business rules that must agree with the API (verdict
  // bands, subject naming, syllabus weights, Manila day bucketing). It is a
  // linked workspace package authored in CommonJS so the CJS backend can
  // require() it with no build step.
  //
  // Vite treats linked workspace packages as SOURCE and does not pre-bundle them
  // by default, which would leave `module.exports` unhandled in the browser
  // build. Listing it here forces esbuild to convert it to ESM, so named imports
  // resolve in dev, in vitest, and in the production bundle alike.
  optimizeDeps: {
    include: ['@ree/shared'],
  },
  ssr: {
    noExternal: ['@ree/shared'],
  },
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
          // NO manual chunk for recharts, for the same reason as the PDF path
          // below: naming a chunk makes rolldown emit it as a STATIC import of
          // the entry, even when every consumer sits behind React.lazy().
          // All four do — ThetaVelocityChart and MockBoardAnalytics via
          // Dashboard.jsx, AnalyticsDeepDive via Profile.jsx, CalibrationCurve
          // via AnalyticsDeepDive — yet index.html still modulepreloaded
          // 117 kB (416 kB raw) of charting on every route, 52% of it unused.
          //
          // PR #90 looked at this and concluded the eager load was correct
          // "because recharts is statically imported by several components".
          // That was wrong: those components import it statically, but they
          // are themselves lazy, so the only thing making it eager was this
          // line. Verified by build: without it, recharts leaves the preload
          // list entirely and lands in async-only chunks.
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('pdfjs-dist')) return 'pdf';
          if (id.includes('socket.io-client')) return 'socket';
          // NO manual chunk for KaTeX + the markdown pipeline. Third time this
          // trap has been found in this file, and by far the most expensive:
          // `latex` was 398 kB of JS plus 29 kB of CSS, modulepreloaded on
          // EVERY route including the dashboard, which renders no maths at all.
          //
          // The old comment here argued the chunk "keeps it out of the shared
          // vendor chunk on the home route" — but naming it is precisely what
          // put it ON the home route, as a static entry import. LatexRenderer
          // is statically imported by 13 modules, yet all of them are reached
          // only through lazy pages, so nothing needed it eagerly.
          //
          // Measured, not reasoned: eager payload (entry + every preload and
          // stylesheet) 1,029,741 -> 611,139 bytes, -40.7%, while total emitted
          // bytes moved by -523 across 73 -> 71 chunks. Same code, just no
          // longer on the boot path. KaTeX now sits in one async
          // LatexRenderer-*.js reached when a maths surface actually renders.
          // NO manual chunk for the PDF/screenshot export path (jspdf,
          // html2canvas). Naming a chunk here forces rolldown to emit it as a
          // STATIC import of the entry, which cancels the `await import()` in
          // pdfEngine/certificateEngine/examPaper and made index.html
          // modulepreload 183 kB (606 kB raw) of export-only code on EVERY
          // route. Verified against the deployed bundle: with this rule the
          // entry contained `from"./pdf-export-*.js"`; without it the chunk
          // leaves the preload list entirely and splits into two async chunks
          // fetched only when a user actually exports.
          // NO manual chunk for motion, for the same reason — and this one only
          // became visible once `latex` was removed. With `latex` named, motion
          // was reached dynamically; without it, rolldown re-grouped and the
          // `motion` rule promoted 128 kB into a STATIC entry import, silently
          // eating a third of the win above.
          //
          // motion/react has exactly two importers, PrescriptionPanel and
          // TrajectoryCard, both reached only through the lazy Dashboard. So it
          // is lazy-only code and must not be named. Unnamed, it folds into
          // Dashboard-*.js, its single consumer path, with no duplication.
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
        // Adds a `notificationclick` handler to the generated SW (public/) so a
        // tap on the in-page Pomodoro notification focuses/opens the app. Local
        // notifications only — no push subscription or FCM involved.
        importScripts: ['notifications-sw.js'],
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
  };
});
