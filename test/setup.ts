import { beforeEach } from 'vitest'

/**
 * 内存版 uni storage 桩。
 *
 * 测试跑在 node 环境下，没有全局 uni。utils/storage.ts 的 try/catch 会把
 * ReferenceError 吞掉并一律返回兜底值 —— 于是任何依赖持久化的分支都测不到
 * （比如「是不是首次打开」永远为真）。这里补一个内存实现，让这些分支可测。
 */
const memory = new Map<string, unknown>()

const uniStub = {
  getStorageSync(key: string) {
    return memory.has(key) ? memory.get(key) : ''
  },
  setStorageSync(key: string, value: unknown) {
    memory.set(key, value)
  },
  removeStorageSync(key: string) {
    memory.delete(key)
  },
}

Object.defineProperty(globalThis, 'uni', { value: uniStub, writable: true, configurable: true })

beforeEach(() => {
  memory.clear()
})
