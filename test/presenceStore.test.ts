import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getOnlineCount = vi.fn()
const heartbeat = vi.fn()
vi.mock('@/cloud/api', () => ({
  getOnlineCount: (...a: unknown[]) => getOnlineCount(...a),
  heartbeat: (...a: unknown[]) => heartbeat(...a),
}))

const { usePresenceStore } = await import('@/stores/presence')

beforeEach(() => {
  setActivePinia(createPinia())
  getOnlineCount.mockReset()
  heartbeat.mockReset().mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('在线人数与省份分布', () => {
  it('拉到数据后同时更新人数与分布', async () => {
    getOnlineCount.mockResolvedValue({
      count: 16,
      provinces: [{ province: '广东', count: 11 }, { province: '北京', count: 5 }],
    })
    const store = usePresenceStore()
    await store.refresh()

    expect(store.count).toBe(16)
    expect(store.provinces).toHaveLength(2)
    expect(store.label.text).toBe('此刻 16 人在小憩')
  })

  // 这是真实修过的问题：云函数原本在查询失败时降级返回 { count: 0 }，
  // 客户端收到的是一次「成功的 0 人」，于是把人数刷成 0、地图清空。
  // 改成如实抛错后，这里的兜底才真正生效。
  it('拉取失败时维持上一次的数字，不清零', async () => {
    getOnlineCount.mockResolvedValue({ count: 16, provinces: [{ province: '广东', count: 11 }] })
    const store = usePresenceStore()
    await store.refresh()

    getOnlineCount.mockRejectedValue(new Error('云函数炸了'))
    await store.refresh()

    expect(store.count).toBe(16)
    expect(store.provinces).toHaveLength(1)
    expect(store.label.text).toBe('此刻 16 人在小憩')
  })

  it('拉取失败不会把异常抛给调用方', async () => {
    getOnlineCount.mockRejectedValue(new Error('网络炸了'))
    const store = usePresenceStore()

    await expect(store.refresh()).resolves.toBeUndefined()
  })

  it('真的 0 人时如实显示（不能和失败混为一谈）', async () => {
    getOnlineCount.mockResolvedValue({ count: 0, provinces: [] })
    const store = usePresenceStore()
    await store.refresh()

    expect(store.count).toBe(0)
    expect(store.label.text).toBe('此刻还没有人在小憩')
  })

  it('省份字段缺失时按空数组处理，不让地图崩掉', async () => {
    getOnlineCount.mockResolvedValue({ count: 3 })
    const store = usePresenceStore()
    await store.refresh()

    expect(store.provinces).toEqual([])
    expect(store.count).toBe(3)
  })

  it('总人数可以大于各省之和 —— 有些用户 IP 定位不出来', async () => {
    getOnlineCount.mockResolvedValue({
      count: 20,
      provinces: [{ province: '广东', count: 11 }, { province: '北京', count: 5 }],
    })
    const store = usePresenceStore()
    await store.refresh()

    const sum = store.provinces.reduce((n, p) => n + p.count, 0)
    expect(store.count).toBeGreaterThan(sum)
    expect(store.count).toBe(20)
  })
})

describe('心跳的启停', () => {
  it('启动时立刻发一次心跳并拉一次数据，不等第一个间隔', async () => {
    getOnlineCount.mockResolvedValue({ count: 1, provinces: [] })
    const store = usePresenceStore()
    store.startHeartbeat()
    await vi.waitFor(() => expect(heartbeat).toHaveBeenCalled())

    expect(getOnlineCount).toHaveBeenCalled()
    store.stopHeartbeat()
  })

  it('重复启动不会叠加定时器', async () => {
    getOnlineCount.mockResolvedValue({ count: 1, provinces: [] })
    const store = usePresenceStore()
    store.startHeartbeat()
    store.startHeartbeat()
    store.startHeartbeat()
    await vi.waitFor(() => expect(heartbeat).toHaveBeenCalled())

    // 三次 start 只应触发一次立即上报
    expect(heartbeat).toHaveBeenCalledTimes(1)
    store.stopHeartbeat()
  })

  it('心跳失败不影响拉取在线数', async () => {
    heartbeat.mockRejectedValue(new Error('心跳炸了'))
    getOnlineCount.mockResolvedValue({ count: 7, provinces: [] })
    const store = usePresenceStore()

    store.startHeartbeat()
    await vi.waitFor(() => expect(store.count).toBe(7))
    store.stopHeartbeat()
  })
})
