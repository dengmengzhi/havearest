import type { TimerEndReason, TimeSlot } from '@/types'

/**
 * 埋点事件常量。
 *
 * PRD 非功能·可维护：事件名必须集中在一个常量文件，禁止在调用处写字面量。
 * 事件与字段逐条取自 PRD「数据与埋点 › 事件表」。
 */
export const AnalyticsEvent = {
  appOpen: 'app_open',
  greetingShow: 'greeting_show',
  onlineShow: 'online_show',
  timerStart: 'timer_start',
  timerEnd: 'timer_end',
  timerChoice: 'timer_choice',
  disguiseOn: 'disguise_on',
  disguiseOff: 'disguise_off',
  feedbackSubmit: 'feedback_submit',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent]

/**
 * 每个事件的载荷。用判别联合把事件名和字段绑死 —— 字段写错或漏写，
 * 类型检查阶段就会报错，不用等到看数时才发现埋点是空的。
 */
export type AnalyticsPayload
  = | { event: typeof AnalyticsEvent.appOpen, scene: number, hour: number, isNew: boolean }
    | { event: typeof AnalyticsEvent.greetingShow, greetingId: string, slot: TimeSlot }
    | { event: typeof AnalyticsEvent.onlineShow, count: number, shown: boolean }
    | { event: typeof AnalyticsEvent.timerStart, duration: number }
    | { event: typeof AnalyticsEvent.timerEnd, actualSeconds: number, reason: TimerEndReason }
    | { event: typeof AnalyticsEvent.timerChoice, choice: 'back' | 'again', againCount: number }
    | { event: typeof AnalyticsEvent.disguiseOn, fromTimerSeconds: number }
    | { event: typeof AnalyticsEvent.disguiseOff, fromTimerSeconds: number }
    | { event: typeof AnalyticsEvent.feedbackSubmit, length: number }
