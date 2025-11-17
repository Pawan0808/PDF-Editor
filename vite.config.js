import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all addresses, so LAN devices can access
    port: 5173,
    proxy: {
      '/webhook-test': {
        target: 'https://free143.app.n8n.cloud',
        changeOrigin: true,
        secure: true
      },
      '/webhook': {
        target: 'https://free143.app.n8n.cloud',
        changeOrigin: true,
        secure: true
      }
    }
  }
})