import { describe, expect, it } from 'vitest'
import { appendSeen, pickUnseen, takeUnseen } from '@/utils/dedupe'

interface Item { id: string }

function pool(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({ id: `c-${i + 1}` }))
}

/** 确定性随机源：始终返回 0，让 shuffle 行为可预测。 */
const stableRandom = () => 0

describe('takeUnseen 取未看过的条目', () => {
  // A10
  it('取出的条目不含 excludeIds 里的任何一个', () => {
    const excluded = ['c-1', 'c-2', 'c-3']
    const picked = takeUnseen(pool(20), excluded, 5, stableRandom)

    expect(picked).toHaveLength(5)
    for (const item of picked)
      expect(excluded).not.toContain(item.id)
  })

  it('一次取 20 张时互不重复', () => {
    const picked = takeUnseen(pool(50), [], 20, stableRandom)
    const ids = picked.map(i => i.id)

    expect(picked).toHaveLength(20)
    expect(new Set(ids).size).toBe(20)
  })

  it('可选条目不足时返回能取到的全部，不补齐', () => {
    const picked = takeUnseen(pool(10), ['c-1', 'c-2'], 20, stableRandom)
    expect(picked).toHaveLength(8)
  })

  it('全部看过时返回空数组，由调用方决定重置', () => {
    const all = pool(5).map(i => i.id)
    expect(takeUnseen(pool(5), all, 5, stableRandom)).toHaveLength(0)
  })

  it('不修改传入的池子', () => {
    const original = pool(5)
    const snapshot = original.map(i => i.id)
    takeUnseen(original, [], 5, stableRandom)
    expect(original.map(i => i.id)).toEqual(snapshot)
  })
})

describe('pickUnseen 取单条', () => {
  // A8 的基础：同一天连续取不重复
  it('连续取 10 次，每次排除已取的，结果互不重复', () => {
    const items = pool(15)
    const seen: string[] = []

    for (let i = 0; i < 10; i++) {
      const picked = pickUnseen(items, seen, stableRandom)
      expect(picked).not.toBeNull()
      seen.push(picked!.id)
    }

    expect(new Set(seen).size).toBe(10)
  })

  it('池子耗尽时返回 null', () => {
    const items = pool(3)
    expect(pickUnseen(items, ['c-1', 'c-2', 'c-3'], stableRandom)).toBeNull()
  })

  it('耗尽后清空已看列表即可重新取到', () => {
    const items = pool(3)
    expect(pickUnseen(items, ['c-1', 'c-2', 'c-3'], stableRandom)).toBeNull()
    expect(pickUnseen(items, [], stableRandom)).not.toBeNull()
  })
})

describe('appendSeen 已看列表裁剪', () => {
  it('未超上限时全部保留', () => {
    expect(appendSeen(['a', 'b'], ['c'], 200)).toEqual(['a', 'b', 'c'])
  })

  it('超过上限时保留最近的，丢掉最早的', () => {
    const seen = Array.from({ length: 200 }, (_, i) => `id-${i}`)
    const result = appendSeen(seen, ['new-1', 'new-2'], 200)

    expect(result).toHaveLength(200)
    expect(result.at(-1)).toBe('new-2')
    expect(result).not.toContain('id-0')
    expect(result).not.toContain('id-1')
    expect(result).toContain('id-2')
  })

  it('不修改传入的数组', () => {
    const seen = ['a', 'b']
    appendSeen(seen, ['c'], 200)
    expect(seen).toEqual(['a', 'b'])
  })
})
