import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Allow external connections
    strictPort: true, // Don't try other ports if 5173 is taken
    allowedHosts: [
      '.ngrok-free.app' // Allow all ngrok subdomains (wildcard)
    ],
    hmr: {
      clientPort: 443 // Connect HMR through ngrok's HTTPS port
    }
  }
})