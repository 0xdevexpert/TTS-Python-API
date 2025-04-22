import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8080,
    hmr: {
      protocol: 'wss',
      host: 'tts.catacomb.fyi',
      port: 443, // Ensure HMR uses the correct port for HTTPS
    },
    proxy: {
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
      '/src': {
        target: 'http://localhost:8080', // Proxy requests to /src to the local server
        changeOrigin: true,
      },
    },
  },
});