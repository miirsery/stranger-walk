import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const dir = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Относительные пути: сборка должна работать и из file:// внутри Capacitor/Tauri.
  base: './',
  plugins: [vue()],
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
