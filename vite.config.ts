import { fileURLToPath, URL } from 'node:url'
import Uni from '@uni-helper/plugin-uni'
import { defineConfig } from 'vite'

const srcPath = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': srcPath,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // uni.scss 的内容会被注入到每个组件的 <style> 里，届时相对路径是
        // 相对该组件解析的，'./styles/tokens.scss' 必然找不到。
        // 把 src 加进查找路径，uni.scss 里就能用 'styles/tokens.scss' 稳定引到。
        includePaths: [srcPath],
        loadPaths: [srcPath],
      },
    },
  },
  plugins: [Uni()],
})
