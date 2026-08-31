import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // host: true expone el servidor de desarrollo en la red local (0.0.0.0) para
  // poder abrir la app desde el celular por WiFi (http://<IP-de-la-PC>:5173).
  server: {
    host: true,
  },
  optimizeDeps: {
    include: ['pizzip', 'docxtemplater'],
  },
})
