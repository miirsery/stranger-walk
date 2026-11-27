import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const dir = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Относительные пути: сборка должна работать и из file:// внутри Capacitor/Tauri.
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Stranger Walk',
        short_name: 'Stranger Walk',
        description: 'Пиксельная карточная RPG о Страннике, потерявшем память',
        lang: 'ru',
        theme_color: '#14121f',
        background_color: '#1d1a2e',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Движок (createGame) и экран игры (GameView) скачиваются лениво — кэшировать их тоже,
        // иначе офлайн-открытие уровня после установки не сработает.
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,webp}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@core': dir('./src/core'),
      '@content': dir('./src/content'),
      '@': dir('./src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Rust-бэкенд из docker compose (в MVP фронтенд к нему ещё не обращается).
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    target: 'es2023',
    chunkSizeWarningLimit: 1800,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
