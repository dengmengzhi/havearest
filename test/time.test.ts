import { describe, expect, it } from 'vitest'
import {
  elapsedSeconds,
  formatCountdown,
  formatDuration,
  remainingSeconds,
  resolveSlot,
} from '@/utils/time'

/** 造一个确定是工作日的日期：2026-09-16 是周三。 */
function weekdayAt(hour: number, minute: number): Date {
  return new Date(2026, 8, 16, hour, minute, 0)
}

describe('resolveSlot 时段边界', () => {
  // A1：PRD F2 的六个时段，各取边界值两端
  it.each([
    ['早 起点 06:00', 6, 0, 'earlyMorning'],
    ['早 终点 09:29', 9, 29, 'earlyMorning'],
    ['上午 起点 09:30', 9, 30, 'morning'],
    ['上午 终点 11:29', 11, 29, 'morning'],
    ['午间 起点 11:30', 11, 30, 'noon'],
    ['午间 终点 13:29', 13, 29, 'noon'],
    ['午后 起点 13:30', 13, 30, 'afternoon'],
    ['午后 终点 15:29', 15, 29, 'afternoon'],
    ['傍晚 起点 15:30', 15, 30, 'evening'],
    ['傍晚 终点 18:29', 18, 29, 'evening'],
    ['夜间 起点 18:30', 18, 30, 'night'],
  ])('%s 落在正确时段', (_label, hour, minute, expected) => {
    expect(resolveSlot(weekdayAt(hour, minute))).toBe(expected)
  })

  it('夜间跨零点：23:59 与 00:00 同属夜间', () => {
    expect(resolveSlot(weekdayAt(23, 59))).toBe('night')
    expect(resolveSlot(weekdayAt(0, 0))).toBe('night')
  })

  it('夜间终点 05:59 仍是夜间，06:00 才切到早', () => {
    expect(resolveSlot(weekdayAt(5, 59))).toBe('night')
    expect(resolveSlot(weekdayAt(6, 0))).toBe('earlyMorning')
  })

  // A2：周末优先级高于时段
  it('周六下午返回 weekend 而不是 afternoon', () => {
    // 2026-09-19 是周六
    expect(resolveSlot(new Date(2026, 8, 19, 14, 0))).toBe('weekend')
  })

  it('周日凌晨返回 weekend 而不是 night', () => {
    // 2026-09-20 是周日
    expect(resolveSlot(new Date(2026, 8, 20, 2, 0))).toBe('weekend')
  })
})

describe('formatDuration 结束页时长文案', () => {
  // A3
  it('不足一分钟只说秒', () => {
    expect(formatDuration(0)).toBe('0 秒')
    expect(formatDuration(59)).toBe('59 秒')
  })

  it('整分钟不带秒', () => {
    expect(formatDuration(60)).toBe('1 分')
    expect(formatDuration(3600)).toBe('60 分')
  })

  it('312 秒显示为 5 分 12 秒', () => {
    expect(formatDuration(312)).toBe('5 分 12 秒')
  })

  it('负数按 0 处理', () => {
    expect(formatDuration(-10)).toBe('0 秒')
  })
})

describe('formatCountdown 倒计时显示', () => {
  // A4
  it('固定两位补零', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(9)).toBe('00:09')
    expect(formatCountdown(312)).toBe('05:12')
    expect(formatCountdown(600)).toBe('10:00')
  })

  it('负数显示 00:00，不出现负号', () => {
    expect(formatCountdown(-5)).toBe('00:00')
  })
})

describe('remainingSeconds 计时校正', () => {
  // A5：PRD F1 验收第 2 条 —— 切后台 2 分钟回来，倒计时正确减去 2 分钟
  it('切后台 2 分钟后，5 分钟计时只剩 3 分钟', () => {
    const startAt = 1_000_000
    const after2min = startAt + 120_000
    expect(remainingSeconds(startAt, 5, after2min)).toBe(180)
  })

  it('刚开始时剩余等于总时长', () => {
    const startAt = 1_000_000
    expect(remainingSeconds(startAt, 3, startAt)).toBe(180)
  })

  it('超时后不返回负数', () => {
    const startAt = 1_000_000
    expect(remainingSeconds(startAt, 3, startAt + 999_000)).toBe(0)
  })

  it('三种时长的总秒数准确', () => {
    const t = 1_000_000
    expect(remainingSeconds(t, 3, t)).toBe(180)
    expect(remainingSeconds(t, 5, t)).toBe(300)
    expect(remainingSeconds(t, 10, t)).toBe(600)
  })
})

describe('elapsedSeconds 实际时长', () => {
  it('按真实时间差计算，不依赖 interval 累加', () => {
    const startAt = 1_000_000
    expect(elapsedSeconds(startAt, startAt + 312_000)).toBe(312)
  })

  it('时钟回拨时返回 0 而不是负数', () => {
    const startAt = 1_000_000
    expect(elapsedSeconds(startAt, startAt - 5000)).toBe(0)
  })
})
