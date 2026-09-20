import type { Greeting } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getGreetings = vi.fn()
vi.mock('@/cloud/api', () => ({ getGreetings: (...args: unknown[]) => getGreetings(...args) }))

const { useGreetingStore } = await import('@/stores/greeting')

/** 2026-09-16 是周三下午，落在 afternoon 时段。 */
const WED_AFTERNOON = new Date(2026, 8, 16, 14, 0)

function greeting(id: string): Greeting {
  return { id, slot: 'afternoon', text: `文案 ${id}` }
}

/** 模拟服务端行为：候选集在请求时就按 excludeIds 过滤掉。 */
function serverWith(pool: Greeting[]) {
  return ({ excludeIds }: { excludeIds: string[] }) => ({
    greetings: pool.filter(g => !excludeIds.includes(g.id)),
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  getGreetings.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('问候文案去重', () => {
  it('首次使用显示固定欢迎语，不请求文案库', async () => {
    const store = useGreetingStore()
    await store.pick(WED_AFTERNOON)

    expect(store.text).toBe('嗨，我是你的小憩搭子')
    expect(getGreetings).not.toHaveBeenCalled()
  })

  it('非首次时按时段取文案，并记入已展示列表', async () => {
    getGreetings.mockImplementation(serverWith([greeting('a'), greeting('b')]))
    const store = useGreetingStore()

    await store.pick(WED_AFTERNOON) // 第一次吃掉欢迎语
    await store.pick(WED_AFTERNOON)

    expect(store.slot).toBe('afternoon')
    expect(store.text).toMatch(/^文案 /)
    expect(store.shownIdsToday).toHaveLength(1)
  })

  it('连续取 10 次都取得到文案，不出现空行', async () => {
    const pool = Array.from({ length: 12 }, (_, i) => greeting(`g${i}`))
    getGreetings.mockImplementation(serverWith(pool))
    const store = useGreetingStore()

    await store.pick(WED_AFTERNOON) // 欢迎语
    for (let i = 0; i < 10; i++) {
      await store.pick(WED_AFTERNOON)
      expect(store.text).not.toBe('')
    }
  })

  it('文案库耗尽后重新拉取，而不是在空候选集上重试', async () => {
    // 只有 2 条，第 3 次请求时服务端会返回空数组
    getGreetings.mockImplementation(serverWith([greeting('a'), greeting('b')]))
    const store = useGreetingStore()

    await store.pick(WED_AFTERNOON) // 欢迎语
    await store.pick(WED_AFTERNOON)
    await store.pick(WED_AFTERNOON)

    // 此刻两条都看过了，下一次必须仍然取得到文案
    await store.pick(WED_AFTERNOON)

    expect(store.text).toMatch(/^文案 /)
    expect(store.currentId).not.toBe('')
    expect(store.shownIdsToday).toHaveLength(1) // 已重置并重新计数
  })

  it('请求失败时回落到欢迎语，不留空行', async () => {
    getGreetings.mockRejectedValue(new Error('网络炸了'))
    const store = useGreetingStore()

    await store.pick(WED_AFTERNOON) // 欢迎语
    await store.pick(WED_AFTERNOON)

    expect(store.text).toBe('嗨，我是你的小憩搭子')
  })
})
