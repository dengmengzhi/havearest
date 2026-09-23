import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsEvent } from '@/constants/events'
import { track } from '@/utils/track'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('track 埋点兜底', () => {
  // A11：PRD 非功能·稳定性 —— 埋点失败不影响主流程
  it('正常调用不抛错', () => {
    expect(() => track({ event: AnalyticsEvent.timerStart, duration: 5 })).not.toThrow()
  })

  it('内部实现抛错时也被吞掉，不影响调用方', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('上报通道炸了')
    })

    expect(() => track({ event: AnalyticsEvent.timerStart, duration: 5 })).not.toThrow()
  })

  it('返回 undefined，调用方不需要 await 也不需要 catch', () => {
    expect(track({ event: AnalyticsEvent.onlineShow, count: 41, shown: true })).toBeUndefined()
  })
})

describe('埋点事件常量', () => {
  it('事件名与 PRD 事件表一致', () => {
    expect(AnalyticsEvent.appOpen).toBe('app_open')
    expect(AnalyticsEvent.timerEnd).toBe('timer_end')
    expect(AnalyticsEvent.disguiseOn).toBe('disguise_on')
    expect(AnalyticsEvent.feedbackSubmit).toBe('feedback_submit')
  })

  // PRD 事件表原有 11 个，card_view / card_dwell 随卡片功能一并移除
  it('覆盖 9 个事件', () => {
    expect(Object.keys(AnalyticsEvent)).toHaveLength(9)
  })
})
