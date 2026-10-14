/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // En desarrollo /api va al backend; en EC2 lo resuelve Caddy (mismo origen, sin CORS).
  server: { proxy: { '/api': 'http://localhost:3000' } },
  test: { environment: 'jsdom' },
})
