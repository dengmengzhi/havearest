import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const finishSession = vi.fn()
vi.mock('@/cloud/api', () => ({
  finishSession: (...a: unknown[]) => finishSession(...a),
}))

const { useTimerStore } = await import('@/stores/timer')

const T0 = 1_700_000_000_000

beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(Date, 'now').mockReturnValue(T0)
  finishSession.mockReset().mockResolvedValue({ ok: true })
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

describe('倒计时驱动', () => {
  // 只 mock 定时器，不 mock Date —— 上面的用例靠 vi.spyOn(Date, 'now') 控制时间，
  // useFakeTimers 默认会把 Date 也接管掉，两者会打架
  function useTimers() {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('开始计时后会随时间推进，不需要手动 tick', () => {
    useTimers()
    const timer = useTimerStore()
    timer.start(5)
    expect(timer.countdownText).toBe('05:00')

    // 走过 30 秒真实时间
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 30_000)
    vi.advanceTimersByTime(30_000)

    expect(timer.countdownText).toBe('04:30')
  })

  it('归零时自动进入 notifying，不需要外部检测', () => {
    useTimers()
    const timer = useTimerStore()
    timer.start(3)

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 180_000)
    vi.advanceTimersByTime(180_000)

    expect(timer.status).toBe('notifying')
    expect(timer.countdownText).toBe('00:00')
  })

  it('进入 notifying 后停止刷新，时长就此定格', () => {
    useTimers()
    const timer = useTimerStore()
    timer.start(3)

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 180_000)
    vi.advanceTimersByTime(180_000)
    const frozen = timer.elapsed

    // 提示停留的 2 秒不应该继续累加到本次时长里
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 182_000)
    vi.advanceTimersByTime(2000)

    expect(timer.elapsed).toBe(frozen)
    expect(timer.elapsed).toBe(180)
  })

  it('手动结束后不再刷新', () => {
    useTimers()
    const timer = useTimerStore()
    timer.start(5)

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 10_000)
    vi.advanceTimersByTime(10_000)
    timer.finish('manual')
    const frozen = timer.elapsed

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 60_000)
    vi.advanceTimersByTime(50_000)

    expect(timer.elapsed).toBe(frozen)
    expect(timer.status).toBe('finished')
  })

  it('stopTick 之后倒计时不再走动（页面卸载时依赖它）', () => {
    useTimers()
    const timer = useTimerStore()
    timer.start(5)
    timer.stopTick()

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 30_000)
    vi.advanceTimersByTime(30_000)

    expect(timer.countdownText).toBe('05:00')
  })

  it('回到前台会重新拉起刷新', () => {
    useTimers()
    const timer = useTimerStore()
    timer.start(10)
    timer.stopTick() // 模拟后台期间 interval 被挂起

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 60_000)
    timer.syncFromBackground(T0)
    expect(timer.countdownText).toBe('09:00')

    // 刷新已恢复，再走 30 秒应继续减
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 90_000)
    vi.advanceTimersByTime(30_000)
    expect(timer.countdownText).toBe('08:30')
  })

  it('再歇一会儿会重新启动刷新', () => {
    useTimers()
    const timer = useTimerStore()
    timer.start(3)
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 180_000)
    vi.advanceTimersByTime(180_000)
    expect(timer.status).toBe('notifying')

    // 结束页选择再歇一会儿
    const againAt = T0 + 182_000
    vi.spyOn(Date, 'now').mockReturnValue(againAt)
    timer.again()
    expect(timer.status).toBe('running')

    vi.spyOn(Date, 'now').mockReturnValue(againAt + 20_000)
    vi.advanceTimersByTime(20_000)
    expect(timer.countdownText).toBe('02:40')
  })

  it('三种时长的归零时刻都准确', () => {
    for (const minutes of [3, 5, 10] as const) {
      setActivePinia(createPinia())
      useTimers()
      vi.spyOn(Date, 'now').mockReturnValue(T0)
      const timer = useTimerStore()
      timer.start(minutes)

      // 差 1 秒时还在跑
      vi.spyOn(Date, 'now').mockReturnValue(T0 + minutes * 60_000 - 1000)
      vi.advanceTimersByTime(minutes * 60_000 - 1000)
      expect(timer.status).toBe('running')

      // 到点即归零
      vi.spyOn(Date, 'now').mockReturnValue(T0 + minutes * 60_000)
      vi.advanceTimersByTime(1000)
      expect(timer.status).toBe('notifying')

      vi.useRealTimers()
    }
  })
})

describe('到点后的实际时长', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // 实测发现：提示停留的 2 秒曾被算进本次时长，3 分钟的计时显示成「3 分 2 秒」
  it('提示停留的 2 秒不计入实际时长', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const timer = useTimerStore()
    timer.start(3)

    // 到点
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 180_000)
    vi.advanceTimersByTime(180_000)
    expect(timer.status).toBe('notifying')
    expect(timer.elapsed).toBe(180)

    // 页面在提示 2 秒后才调用 finish
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 182_000)
    timer.finish('timeout')

    expect(timer.elapsed).toBe(180)
    expect(timer.endReason).toBe('timeout')
  })

  it('手动结束仍按当下真实时间算', () => {
    const timer = useTimerStore()
    timer.start(5)

    vi.spyOn(Date, 'now').mockReturnValue(T0 + 47_000)
    timer.finish('manual')

    expect(timer.elapsed).toBe(47)
  })
})

describe('累计小憩的记录', () => {
  it('结束时累加次数与时长', () => {
    const timer = useTimerStore()
    expect(timer.tally.sessions).toBe(0)

    timer.start(5)
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 312_000)
    timer.finish('manual')

    expect(timer.tally.sessions).toBe(1)
    expect(timer.tally.seconds).toBe(312)
  })

  it('累加会落盘，下次进来还在', () => {
    const timer = useTimerStore()
    timer.start(5)
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 180_000)
    timer.finish('manual')

    // 换一个 store 实例（模拟重新打开小程序），本地存储里应该还有
    setActivePinia(createPinia())
    const next = useTimerStore()
    expect(next.tally.sessions).toBe(1)
    expect(next.tally.seconds).toBe(180)
  })

  it('多次小憩持续累加', () => {
    const timer = useTimerStore()
    for (const [i, secs] of [120, 300, 60].entries()) {
      timer.start(5)
      vi.spyOn(Date, 'now').mockReturnValue(T0 + (i + 1) * 1_000_000)
      timer.startAt = T0 + (i + 1) * 1_000_000 - secs * 1000
      timer.finish('manual')
    }

    expect(timer.tally.sessions).toBe(3)
    expect(timer.tally.seconds).toBe(480)
  })

  // 没真正计时就到结束页，计进去会让「第 N 次」虚高
  it('0 秒的结束不计入累计', () => {
    const timer = useTimerStore()
    timer.start(5)
    timer.finish('manual') // 立刻结束，elapsed 为 0

    expect(timer.tally.sessions).toBe(0)
  })

  it('后台超时结束同样计入 —— 那段时间用户确实歇了', () => {
    const timer = useTimerStore()
    timer.start(10)
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 31 * 60_000)
    timer.syncFromBackground(T0)

    expect(timer.status).toBe('abandoned')
    expect(timer.tally.sessions).toBe(1)
  })
})

describe('把时长同步到云端（排行榜要用）', () => {
  it('结束时按实际时长上报一次', () => {
    const timer = useTimerStore()
    timer.start(5)
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 200_000)
    timer.finish('manual')

    expect(finishSession).toHaveBeenCalledTimes(1)
    expect(finishSession).toHaveBeenCalledWith({ seconds: 200 })
  })

  // 没开始就结束不该占一次，否则榜单上会多出一堆 0 秒的记录
  it('0 秒不上报', () => {
    const timer = useTimerStore()
    timer.start(5)
    timer.finish('manual')

    expect(finishSession).not.toHaveBeenCalled()
  })

  // 切后台超时同样是一次真实歇过的时间，本地累计算了，云端也该算
  it('后台放弃也上报', () => {
    const timer = useTimerStore()
    timer.start(5)
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 90_000)
    timer.finish('background')

    expect(finishSession).toHaveBeenCalledWith({ seconds: 90 })
  })

  // 上报失败不能把异常漏到调用方 —— 结束页必须照常跳转
  it('上报失败不影响结束流程', () => {
    finishSession.mockRejectedValue(new Error('云函数炸了'))
    const timer = useTimerStore()
    timer.start(5)
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 60_000)

    expect(() => timer.finish('manual')).not.toThrow()
    expect(timer.status).toBe('finished')
  })
})
