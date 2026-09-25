import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const demo = process.env.VITE_DEMO === '1';

export default defineConfig({
  plugins: [react()],
  /* The read-only demo (GitHub Pages) is served from a sub-folder and ships its sample data */
  base: demo ? './' : '/',
  publicDir: demo ? 'demo-public' : 'public',
  build: { outDir: demo ? 'dist-demo' : 'dist' },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
