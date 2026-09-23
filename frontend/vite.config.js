import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mkcert({ hosts: ['localhost', '127.0.0.1', '*.standmanager.local'] })
  ],
  server: {
    https: true,
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['*.standmanager.local', 'mariasstrocchio.standmanager.local']
  }
})