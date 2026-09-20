import { CLOUD_ENV } from './env'

let initialized = false
let mockMode = true

/**
 * 是否走 mock。
 *
 * 两种情况必然 mock：
 *   1. 非微信小程序端 —— wx.cloud 只在 mp-weixin 存在，H5 预览时没有它
 *   2. 环境 id 为空 —— 还没拿到云开发环境
 */
export function isMockMode(): boolean {
  return mockMode
}

/**
 * 初始化云开发。在 App onLaunch 时调用一次。
 * 初始化失败不抛错：降级到 mock 也好过白屏。
 */
export function initCloud(): void {
  if (initialized)
    return
  initialized = true

  // #ifdef MP-WEIXIN
  if (CLOUD_ENV) {
    try {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true })
      mockMode = false
      return
    }
    catch {
      // 落到下面的 mock
    }
  }
  // #endif

  mockMode = true
}

/**
 * 调用云函数。mock 模式下由调用方走 mock.ts，不应该走到这里。
 */
export async function callFunction<T>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  // #ifdef MP-WEIXIN
  const res = await wx.cloud.callFunction({ name, data })
  return res.result as T
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error(`云函数 ${name} 仅在微信小程序端可用`)
  // #endif
}
