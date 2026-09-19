import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 5174 so this can run alongside the storefront on 5173.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
})
