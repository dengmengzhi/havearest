import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimerStore } from '@/stores/timer'

const T0 = 1_700_000_000_000

beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(Date, 'now').mockReturnValue(T0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('计时器状态迁移', () => {
  it('初始为 idle，默认时长 5 分钟', () => {
    const timer = useTimerStore()
    expect(timer.status).toBe('idle')
    expect(timer.duration).toBe(5)
  })

  it('选时长后进入 running', () => {
    const timer = useTimerStore()
    timer.start(3)

    expect(timer.status).toBe('running')
    expect(timer.duration).toBe(3)
    expect(timer.isRunning).toBe(true)
  })

  it('手动结束进入 finished 并记录 reason', () => {
    const timer = useTimerStore()
    timer.start(5)
    timer.finish('manual')

    expect(timer.status).toBe('finished')
    expect(timer.endReason).toBe('manual')
  })

  it('到点先进入 notifying，由页面延迟跳转', () => {
    const timer = useTimerStore()
    timer.start(5)
    timer.notifyTimeout()

    expect(timer.status).toBe('notifying')
  })
})

describe('倒计时与后台校正', () => {
  it('切后台 2 分钟回来，5 分钟计时只剩 3 分钟', () => {
    const timer = useTimerStore()
    timer.start(5)

    // 用户离开 2 分钟后回到前台
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 120_000)
    timer.syncFromBackground(T0)

    expect(timer.remaining).toBe(180)
    expect(timer.countdownText).toBe('03:00')
    expect(timer.status).toBe('running')
  })

  // A6：PRD F1 边界 —— 计时中退出超过 30 分钟视为结束
  it('后台 29 分 59 秒仍在计时', () => {
    const timer = useTimerStore()
    timer.start(10)

    const hiddenAt = T0
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 29 * 60_000 + 59_000)
    timer.syncFromBackground(hiddenAt)

    expect(timer.status).not.toBe('abandoned')
  })

  it('后台满 30 分钟即判定为 abandoned，reason 记 background', () => {
    const timer = useTimerStore()
    timer.start(10)

    const hiddenAt = T0
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 30 * 60_000 + 1000)
    timer.syncFromBackground(hiddenAt)

    expect(timer.status).toBe('abandoned')
    expect(timer.endReason).toBe('background')
  })

  it('回前台时若已到点，进入 notifying 而不是继续跑', () => {
    const timer = useTimerStore()
    timer.start(3)

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 200_000)
    timer.syncFromBackground(T0)

    expect(timer.status).toBe('notifying')
  })

  it('非计时状态下的回前台不改变状态', () => {
    const timer = useTimerStore()
    expect(timer.status).toBe('idle')

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 40 * 60_000)
    timer.syncFromBackground(T0)

    expect(timer.status).toBe('idle')
  })

  it('实际时长按真实时间差算', () => {
    const timer = useTimerStore()
    timer.start(5)

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 312_000)
    timer.tick()

    expect(timer.elapsed).toBe(312)
  })
})

describe('再歇一会儿的次数上限', () => {
  // A7：PRD F1 验收第 4 条 —— 再歇 2 次后按钮消失
  it('初始可以再歇', () => {
    const timer = useTimerStore()
    expect(timer.canRestAgain).toBe(true)
  })

  it('第 1、2 次可用，第 3 次不再显示', () => {
    const timer = useTimerStore()
    timer.start(5)

    timer.finish('timeout')
    timer.again()
    expect(timer.againCount).toBe(1)
    expect(timer.canRestAgain).toBe(true)

    timer.finish('timeout')
    timer.again()
    expect(timer.againCount).toBe(2)
    expect(timer.canRestAgain).toBe(false)
  })

  it('达到上限后再调用 again 不生效', () => {
    const timer = useTimerStore()
    timer.start(5)
    timer.again()
    timer.again()
    timer.again()

    expect(timer.againCount).toBe(2)
  })

  it('再歇时沿用上次选的时长', () => {
    const timer = useTimerStore()
    timer.start(10)
    timer.finish('timeout')
    timer.again()

    expect(timer.duration).toBe(10)
    expect(timer.status).toBe('running')
  })

  it('reset 后回到初始状态，次数清零', () => {
    const timer = useTimerStore()
    timer.start(3)
    timer.again()
    timer.reset()

    expect(timer.status).toBe('idle')
    expect(timer.againCount).toBe(0)
    expect(timer.duration).toBe(5)
  })
})
