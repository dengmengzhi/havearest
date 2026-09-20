import { describe, expect, it } from 'vitest'
import { resolvePresenceLabel } from '@/utils/presence'

describe('resolvePresenceLabel 在线人数文案', () => {
  // A9：PRD F4 验收第 3 条 —— N < 5 时显示保底文案
  it.each([0, 1, 2, 3, 4])('人数 %i 时不显示具体数字', (count) => {
    const label = resolvePresenceLabel(count)

    expect(label.shown).toBe(false)
    expect(label.text).toBe('此刻有几个人也在歇着')
    expect(label.text).not.toMatch(/\d/)
  })

  it('人数达到 5 时开始显示具体数字', () => {
    const label = resolvePresenceLabel(5)

    expect(label.shown).toBe(true)
    expect(label.text).toBe('此刻 5 人在小憩')
  })

  it('人数较多时照常显示', () => {
    expect(resolvePresenceLabel(41).text).toBe('此刻 41 人在小憩')
  })

  // R1：对外文案不得出现违禁字样
  it('两种分支的文案都不含违禁字样', () => {
    for (const count of [0, 4, 5, 41]) {
      expect(resolvePresenceLabel(count).text).not.toContain('摸鱼')
    }
  })

  it('异常输入按 0 处理，不崩也不显示 NaN', () => {
    expect(resolvePresenceLabel(Number.NaN).shown).toBe(false)
    expect(resolvePresenceLabel(-3).shown).toBe(false)
    expect(resolvePresenceLabel(Number.NaN).text).not.toContain('NaN')
  })

  it('小数向下取整', () => {
    expect(resolvePresenceLabel(7.9).text).toBe('此刻 7 人在小憩')
  })
})
