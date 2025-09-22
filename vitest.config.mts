import { configDefaults, defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/ai': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
    },
    exclude: [...configDefaults.exclude, 'backend/server/**/*.test.ts'],
    projects: [
      {
        test: {
          name: 'backend',
          include: ['backend/server/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
