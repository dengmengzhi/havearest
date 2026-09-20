import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 纯逻辑单测：不接 uni 构建插件，环境用 node。
// 不使用 vitest-environment-uniapp —— 那是基于微信开发者工具自动化的 E2E，
// 需要开发者工具在跑，不适合这里的纯函数用例。详见 docs 设计文档 5.7.2。
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
})
