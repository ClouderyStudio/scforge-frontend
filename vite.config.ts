import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 所有环境变量都从 .env / .env.local 读取（见 .env.example）。
  const env = loadEnv(mode, process.cwd(), '')

  // 后端地址：开发时把 /scforge 与 /identity 代理过去。
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5171'

  return {
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
        // 开发环境直连本地 ClouderyApi（默认 http://localhost:5171，可用 VITE_API_PROXY_TARGET 覆盖）。
        '/scforge': { target: proxyTarget, changeOrigin: true },
        '/identity': { target: proxyTarget, changeOrigin: true },
      },
    },
  }
})
