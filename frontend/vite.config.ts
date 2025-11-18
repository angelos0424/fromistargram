import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const getPort = (value: string | undefined, fallback: number) =>
  value ? Number(value) || fallback : fallback;

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.HOST ?? true,
    port: getPort(process.env.PORT, 5173),
    strictPort: true
  },
  preview: {
    host: process.env.HOST ?? true,
    port: getPort(process.env.PREVIEW_PORT ?? process.env.PORT, 4173),
    strictPort: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '../backend/**']
  }
});
