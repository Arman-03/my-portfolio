import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works on GitHub Pages sub-paths and any static host.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Phaser changes rarely; keep it in its own long-cacheable chunk.
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
