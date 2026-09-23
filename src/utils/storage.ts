/**
 * 本地缓存封装。
 *
 * 只用 uni 自带的同步存储，不引第三方持久化插件 —— 主包体积是硬约束（R11）。
 * 所有读写都吞异常：存储失败不应该让主流程崩掉。
 */

const KEY_PREFIX = 'havearest:'

export const StorageKeys = {
  /** 当天已展示的问候 id，用于当天不重复（PRD F2） */
  shownGreetingIds: 'shownGreetingIds',
  /** 上面这份 id 列表属于哪一天，跨天自动重置 */
  greetingDate: 'greetingDate',
  /** 计时器快照，用于冷启动恢复 */
  timerSnapshot: 'timerSnapshot',
  /** 是否首次使用，决定用不用固定欢迎语（PRD F2） */
  hasOpenedBefore: 'hasOpenedBefore',
  /** 已分配的鱼头像 id。一旦写入就不再变，保证头像是稳定的身份标识 */
  fishId: 'fishId',
  /** openid 未就绪时的本地种子，用于在拿到 openid 前也能定下同一条鱼 */
  avatarSeed: 'avatarSeed',
} as const

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys]

export function readStorage<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = uni.getStorageSync(KEY_PREFIX + key)
    if (raw === '' || raw === null || raw === undefined)
      return fallback
    return raw as T
  }
  catch {
    return fallback
  }
}

export function writeStorage<T>(key: StorageKey, value: T): void {
  try {
    uni.setStorageSync(KEY_PREFIX + key, value)
  }
  catch {
    // 存储写失败不影响主流程
  }
}

export function removeStorage(key: StorageKey): void {
  try {
    uni.removeStorageSync(KEY_PREFIX + key)
  }
  catch {
    // 同上
  }
}
