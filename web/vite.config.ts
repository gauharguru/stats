import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Build targets:
   (default)       web app served by the API server
   VITE_DEMO=1     read-only demo for GitHub Pages (sample data, sub-folder)
   VITE_TARGET=app Android app (Capacitor) - talks to the college server, can also run the demo */
const demo = process.env.VITE_DEMO === '1';
const app = process.env.VITE_TARGET === 'app';

export default defineConfig({
  plugins: [react()],
  base: demo || app ? './' : '/',
  publicDir: demo || app ? 'demo-public' : 'public',
  build: { outDir: demo ? 'dist-demo' : app ? 'dist-app' : 'dist' },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
