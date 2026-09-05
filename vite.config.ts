import { defineConfig } from 'vite';

export default defineConfig({
  root: 'preview',
  base: './',
  build: {
    outDir: '../dist-preview',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: new URL('./preview/index.html', import.meta.url).pathname,
        privacy: new URL('./preview/privacy.html', import.meta.url).pathname,
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      'sharedom/ssr': new URL('./src/ssr.ts', import.meta.url).pathname,
      'sharedom': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
