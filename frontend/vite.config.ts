import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const getPort = (value: string | undefined, fallback: number) =>
  value ? Number(value) || fallback : fallback;

const getAllowedHosts = (value: string | undefined) => {
  if (!value) {
    return true;
  }

  const hosts = value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return hosts.length ? hosts : true;
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.HOST ?? true,
    port: getPort(process.env.PORT, 5173),
    strictPort: true,
    allowedHosts: getAllowedHosts(process.env.ALLOWED_HOSTS)
  },
  preview: {
    host: process.env.HOST ?? true,
    port: getPort(process.env.PREVIEW_PORT ?? process.env.PORT, 4173),
    strictPort: true,
    allowedHosts: getAllowedHosts(process.env.PREVIEW_ALLOWED_HOSTS ?? process.env.ALLOWED_HOSTS)
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '../backend/**']
  }
});
