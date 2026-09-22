import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { findFishById, FISH_AVATARS, generateLocalSeed, resolveFish } from '@/utils/avatar'

describe('鱼头像分配', () => {
  it('同一个 seed 永远得到同一条鱼', () => {
    const seed = 'oABCD1234567890xyz'
    const first = resolveFish(seed)

    for (let i = 0; i < 20; i++)
      expect(resolveFish(seed).id).toBe(first.id)
  })

  it('返回的一定是鱼库里的条目', () => {
    for (let i = 0; i < 200; i++) {
      const fish = resolveFish(`openid-${i}`)
      expect(FISH_AVATARS).toContain(fish)
    }
  })

  it('空 seed 不抛错，返回兜底的第一条', () => {
    expect(() => resolveFish('')).not.toThrow()
    expect(resolveFish('').id).toBe(FISH_AVATARS[0].id)
  })

  it('只差一个字符的 openid 也能被分开', () => {
    // 真实 openid 往往前缀雷同，哈希必须对尾部敏感，否则大家都是同一条鱼
    const ids = ['oABCDEFGHIJKLMNOPQ1', 'oABCDEFGHIJKLMNOPQ2', 'oABCDEFGHIJKLMNOPQ3', 'oABCDEFGHIJKLMNOPQ4']
    const picked = new Set(ids.map(id => resolveFish(id).id))
    expect(picked.size).toBeGreaterThan(1)
  })

  it('分布不会塌缩到少数几条鱼上', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 1200; i++) {
      const fish = resolveFish(`o_${i}_${(i * 7919) % 104729}`)
      counts.set(fish.id, (counts.get(fish.id) ?? 0) + 1)
    }

    // 12 条鱼应当全部被用到
    expect(counts.size).toBe(FISH_AVATARS.length)
    // 且没有哪条鱼独占三成以上
    for (const n of counts.values())
      expect(n).toBeLessThan(1200 * 0.3)
  })

  it('每条鱼的 id 与资源路径都唯一', () => {
    expect(new Set(FISH_AVATARS.map(f => f.id)).size).toBe(FISH_AVATARS.length)
    expect(new Set(FISH_AVATARS.map(f => f.src)).size).toBe(FISH_AVATARS.length)
  })

  it('findFishById 能找回，找不到时返回 null', () => {
    expect(findFishById('fish-07')?.name).toBe('苔绿河豚')
    expect(findFishById('fish-99')).toBeNull()
    expect(findFishById('')).toBeNull()
  })

  it('本地种子每次生成都不同', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => generateLocalSeed()))
    expect(seeds.size).toBe(50)
  })
})

describe('user store 的头像持久化', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('首次调用分配一条鱼并记住它', async () => {
    const { useUserStore } = await import('@/stores/user')
    const user = useUserStore()
    user.resolveAvatar()

    const assigned = user.avatar.id
    expect(FISH_AVATARS.map(f => f.id)).toContain(assigned)

    // 同一会话内反复调用不该换鱼
    user.resolveAvatar()
    expect(user.avatar.id).toBe(assigned)
  })

  it('重新进入（新 store 实例）仍是同一条鱼', async () => {
    const { useUserStore } = await import('@/stores/user')
    const first = useUserStore()
    first.resolveAvatar()
    const assigned = first.avatar.id

    // 模拟重新打开小程序：store 重建，但本地存储还在
    setActivePinia(createPinia())
    const second = useUserStore()
    second.resolveAvatar()

    expect(second.avatar.id).toBe(assigned)
  })

  it('openid 晚到也不会换鱼（避免头像跳变）', async () => {
    const { useUserStore } = await import('@/stores/user')
    const user = useUserStore()
    user.resolveAvatar() // openid 还没到，用本地种子
    const assigned = user.avatar.id

    user.openid = 'oXYZ_completely_different_openid'
    user.resolveAvatar()

    expect(user.avatar.id).toBe(assigned)
  })
})
