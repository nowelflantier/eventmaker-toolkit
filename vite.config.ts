import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/eventmaker-api': {
        target: 'https://app.eventmaker.io',
        changeOrigin: true,
        followRedirects: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/eventmaker-api/, '/api/v1'),
      },
    },
  },
})
