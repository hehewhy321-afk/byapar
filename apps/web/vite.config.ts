import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@byapar/core': path.resolve(__dirname, '../../packages/core/src'),
      '~': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
  },
});
