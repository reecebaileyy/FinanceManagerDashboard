import { configDefaults, defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

const sharedArrayBufferLoader = path.resolve(
  __dirname,
  './src/test/shared-array-buffer-loader.mjs',
);

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
    coverage: {
      provider: 'v8',
    },
    css: false,
    globalSetup: ['./src/test/global-setup.ts'],
    deps: {
      registerNodeLoader: [sharedArrayBufferLoader],
    },
    projects: [
      {
        test: {
          name: 'frontend',
          include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
          exclude: [...configDefaults.exclude, 'backend/server/**/*.test.ts'],
          environment: 'happy-dom',
          setupFiles: ['./src/test/setup.ts'],
          globals: true,
          css: false,
          alias: {
            '@': path.resolve(__dirname, './src'),
            '@app': path.resolve(__dirname, './src/app'),
            '@components': path.resolve(__dirname, './src/components'),
            '@features': path.resolve(__dirname, './src/features'),
            '@lib': path.resolve(__dirname, './src/lib'),
            '@test': path.resolve(__dirname, './src/test'),
          },
        },
      },
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
