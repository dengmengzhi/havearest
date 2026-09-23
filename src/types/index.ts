// 与云数据库集合字段保持单一来源，前后端共用。
// 字段定义取自 PRD「数据与埋点」章节。

/** 问候时段。周末优先级高于时段（PRD F2）。 */
export type TimeSlot
  = | 'earlyMorning' // 06:00 ~ 09:29
    | 'morning' // 09:30 ~ 11:29
    | 'noon' // 11:30 ~ 13:29
    | 'afternoon' // 13:30 ~ 15:29
    | 'evening' // 15:30 ~ 18:29
    | 'night' // 18:30 ~ 05:59（跨零点）
    | 'weekend' // 周六 / 周日，覆盖以上时段

/** greetings 集合 */
export interface Greeting {
  id: string
  slot: TimeSlot
  /** ≤ 30 字 */
  text: string
}

/** users 集合 */
export interface UserProfile {
  openid: string
  firstOpenAt: number
  lastOpenAt: number
  /** 首次来源：scene 值 + 分享参数中的渠道码 */
  source: string
  totalSessions: number
  totalSeconds: number
}

/** 计时器状态机。迁移规则见设计文档 2.2。 */
export type TimerStatus
  = | 'idle' // 未开始：可滑卡片，但不计入有效小憩，结束页不出现
    | 'running' // 计时中
    | 'notifying' // 到点提示中，2 秒后进入结束页
    | 'finished' // 已结束，停留在结束页
    | 'abandoned' // 后台超 30 分钟，视为结束

/** 本次计时如何结束的（埋点 timer_end 的 reason 字段）。 */
export type TimerEndReason = 'timeout' | 'manual' | 'background'

/** PRD F1：三种可选时长（分钟），默认 5。 */
export const DURATION_OPTIONS = [3, 5, 10] as const
export type DurationMinutes = (typeof DURATION_OPTIONS)[number]
export const DEFAULT_DURATION: DurationMinutes = 5

/** PRD F1：本次会话最多再歇 2 次，第 3 次不再显示按钮。 */
export const MAX_AGAIN_COUNT = 2

/** PRD F1 边界：计时中退出超过该时长，视为本次结束。 */
export const BACKGROUND_ABANDON_MS = 30 * 60 * 1000
