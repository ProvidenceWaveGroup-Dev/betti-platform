import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ngrok-specific config - NO SSL (ngrok provides HTTPS)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    allowedHosts: ['halibut-saved-gannet.ngrok-free.app'],
    // Proxy configuration for ngrok
    proxy: {
      // Main backend API (backend uses HTTPS)
      '/api': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      // Video chat WebSocket signaling (HTTP for ngrok mode)
      '/video': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/video/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          $screen-width: 1920px;
          $screen-height: 1080px;
        `
      }
    }
  }
})
