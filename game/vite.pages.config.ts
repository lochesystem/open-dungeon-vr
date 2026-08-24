import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'static-entry',
  base: '/open-dungeon-vr/',
  publicDir: '../public',
  plugins: [react()],
  build: {
    outDir: '../dist-pages',
    emptyOutDir: true,
    sourcemap: true,
  },
});
