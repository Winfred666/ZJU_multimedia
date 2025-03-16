import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    ],
  resolve: {
    alias: {
      "@": "/src", // 确保 "@" 指向项目根目录下的 "src" 文件夹
    },
  },
})
