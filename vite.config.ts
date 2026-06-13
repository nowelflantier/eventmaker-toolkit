import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/eventmaker-dev': {
        target: 'https://app.eventmaker.io',
        changeOrigin: true,
        followRedirects: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/eventmaker-dev/, '/api/v1'),
      },
    },
  },
})
