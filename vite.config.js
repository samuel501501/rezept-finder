import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/spoonacular': {
        target: 'https://api.spoonacular.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spoonacular/, '')
      }
    }
  }
})
