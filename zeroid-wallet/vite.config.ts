import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/quantum': {
        target: 'https://qrng.anu.edu.au',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/quantum/, '/API/jsonI.php'),
      },
    },
  },
})
