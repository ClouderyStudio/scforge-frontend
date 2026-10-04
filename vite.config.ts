import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Material Symbols, compiled to tree-shaken inline SVG components.
    Icons({ compiler: 'vue3', scale: 1, defaultClass: 'md-icon-svg' }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 开发环境直连本地 ClouderyApi（ClouderyApi 默认监听 http://localhost:5171）。
      '/scforge': { target: 'http://localhost:5171', changeOrigin: true },
      '/identity': { target: 'http://localhost:5171', changeOrigin: true },
    },
  },
})
