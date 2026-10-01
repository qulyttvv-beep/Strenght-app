import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: './',
  plugins: [preact()],
  build: { target: 'chrome100', outDir: 'dist', chunkSizeWarningLimit: 1500, sourcemap: false },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
