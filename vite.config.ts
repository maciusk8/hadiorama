import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      // Auth routes -> Elysia backend
      '/auth': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // WebSocket proxy -> Elysia backend
      '/ws/ha': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
      },
      // Local API -> Elysia backend
      '/api/local': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // Uploads -> Elysia backend
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})