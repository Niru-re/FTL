import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ── Production build output ────────────────────────────────────────────────
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split large vendor chunks for better caching
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor':   ['recharts'],
          'map-vendor':     ['leaflet', 'react-leaflet'],
          'icons-vendor':   ['lucide-react'],
        }
      }
    }
  },

  // ── Local dev proxy (not used in production builds) ────────────────────────
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  }
})
