import { describe, expect, it } from 'vitest'
import { resolvePresenceLabel } from '@/utils/presence'

describe('resolvePresenceLabel 在线人数文案', () => {
  // count < 5 的保底文案规则已于 2026-09-23 按需求移除，现在一律显示真实人数
  it.each([1, 2, 3, 4, 5, 41, 999])('人数 %i 直接显示真实数字', (count) => {
    const label = resolvePresenceLabel(count)

    expect(label.text).toBe(`此刻 ${count} 人在小憩`)
    expect(label.shown).toBe(true)
  })

  it('人数为 0 时不显示「0 人」这种读着别扭的文案', () => {
    expect(resolvePresenceLabel(0).text).toBe('此刻还没有人在小憩')
  })

  it('不再存在隐藏具体数字的分支', () => {
    for (const n of [0, 1, 2, 3, 4])
      expect(resolvePresenceLabel(n).shown).toBe(true)
  })

  it('异常输入按 0 处理，不崩也不显示 NaN', () => {
    expect(resolvePresenceLabel(Number.NaN).text).toBe('此刻还没有人在小憩')
    expect(resolvePresenceLabel(-3).text).toBe('此刻还没有人在小憩')
    expect(resolvePresenceLabel(Number.NaN).text).not.toContain('NaN')
  })

  it('小数向下取整', () => {
    expect(resolvePresenceLabel(7.9).text).toBe('此刻 7 人在小憩')
  })

  // R1：对外文案不得出现违禁字样
  it('所有分支的文案都不含违禁字样', () => {
    for (const count of [0, 1, 4, 5, 41])
      expect(resolvePresenceLabel(count).text).not.toContain('摸鱼')
  })
})
