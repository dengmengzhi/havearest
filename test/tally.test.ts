import { describe, expect, it } from 'vitest'
import { addSession, EMPTY_TALLY, formatTallyLine, formatTotal, normalizeTally } from '@/utils/tally'

describe('累加一次小憩', () => {
  it('次数加一，秒数累计', () => {
    expect(addSession({ sessions: 3, seconds: 900 }, 312)).toEqual({ sessions: 4, seconds: 1212 })
  })

  it('从零开始', () => {
    expect(addSession(EMPTY_TALLY, 180)).toEqual({ sessions: 1, seconds: 180 })
  })

  // 没开始就到结束页的情况不该计数，否则「第 N 次」会虚高
  it('0 秒不计入', () => {
    expect(addSession({ sessions: 5, seconds: 1500 }, 0)).toEqual({ sessions: 5, seconds: 1500 })
  })

  it('负数与异常值按 0 处理，不计入', () => {
    const before = { sessions: 2, seconds: 600 }
    expect(addSession(before, -10)).toEqual(before)
    expect(addSession(before, Number.NaN)).toEqual(before)
  })

  it('小数秒向下取整', () => {
    expect(addSession(EMPTY_TALLY, 59.9)).toEqual({ sessions: 1, seconds: 59 })
  })

  it('不修改传入的对象', () => {
    const before = { sessions: 1, seconds: 100 }
    addSession(before, 50)
    expect(before).toEqual({ sessions: 1, seconds: 100 })
  })
})

describe('本地存储的脏值防护', () => {
  it.each([null, undefined, 'x', 42, []])('异常输入 %s 归零', (bad) => {
    expect(normalizeTally(bad)).toEqual(EMPTY_TALLY)
  })

  it('缺字段的对象补零', () => {
    expect(normalizeTally({ sessions: 3 })).toEqual({ sessions: 3, seconds: 0 })
  })

  it('负数与非数字归零', () => {
    expect(normalizeTally({ sessions: -5, seconds: Number.NaN })).toEqual(EMPTY_TALLY)
  })

  it('累加前会先归一化，脏值不会污染结果', () => {
    expect(addSession({ sessions: -3, seconds: Number.NaN } as never, 100))
      .toEqual({ sessions: 1, seconds: 100 })
  })
})

describe('累计时长文案', () => {
  // 累计到秒很琐碎：攒了三小时零八秒，那个八秒没有意义
  it.each([
    [0, '0 秒'],
    [59, '59 秒'],
    [60, '1 分'],
    [312, '5 分'],
    [3599, '59 分'],
    [3600, '1 小时'],
    [4980, '1 小时 23 分'],
    [7200, '2 小时'],
  ])('%i 秒 → %s', (seconds, expected) => {
    expect(formatTotal(seconds)).toBe(expected)
  })

  it('整小时不带「0 分」', () => {
    expect(formatTotal(3600)).not.toContain('分')
    expect(formatTotal(7200)).not.toContain('分')
  })
})

describe('结束页的累计文案', () => {
  // 「这是你第 1 次」是句废话
  it('第一次不显示累计', () => {
    expect(formatTallyLine({ sessions: 1, seconds: 300 })).toBe('')
    expect(formatTallyLine(EMPTY_TALLY)).toBe('')
  })

  it('第二次起才出现', () => {
    expect(formatTallyLine({ sessions: 2, seconds: 600 })).toBe('第 2 次小憩，一共歇了 10 分')
  })

  it('累计跨小时的表述', () => {
    expect(formatTallyLine({ sessions: 12, seconds: 4980 })).toBe('第 12 次小憩，一共歇了 1 小时 23 分')
  })

  it('脏值不会渲染出 NaN', () => {
    expect(formatTallyLine({ sessions: Number.NaN, seconds: Number.NaN } as never)).toBe('')
    expect(formatTallyLine(null as never)).toBe('')
  })
})
