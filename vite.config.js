import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist', emptyOutDir: true, sourcemap: false,
    chunkSizeWarningLimit: 650,
    rollupOptions: { output: { manualChunks(id) { if (id.includes('/node_modules/')) return 'firebase-vendor'; } } },
  },
  server: { strictPort: true },
});
