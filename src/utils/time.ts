import type { TimeSlot } from '@/types'

/**
 * 判定问候时段。
 *
 * 时段边界取自 PRD F2，闭区间写法：
 *   早 06:00~09:29 / 上午 09:30~11:29 / 午间 11:30~13:29
 *   午后 13:30~15:29 / 傍晚 15:30~18:29 / 夜间 18:30~05:59（跨零点）
 *
 * 周末（周六、周日）使用单独文案库，优先级高于时段。
 */
export function resolveSlot(date: Date): TimeSlot {
  const day = date.getDay()
  if (day === 0 || day === 6)
    return 'weekend'

  const minutes = date.getHours() * 60 + date.getMinutes()

  if (minutes >= 360 && minutes <= 569)
    return 'earlyMorning' // 06:00 ~ 09:29
  if (minutes >= 570 && minutes <= 689)
    return 'morning' // 09:30 ~ 11:29
  if (minutes >= 690 && minutes <= 809)
    return 'noon' // 11:30 ~ 13:29
  if (minutes >= 810 && minutes <= 929)
    return 'afternoon' // 13:30 ~ 15:29
  if (minutes >= 930 && minutes <= 1109)
    return 'evening' // 15:30 ~ 18:29
  return 'night' // 18:30 ~ 23:59 与 00:00 ~ 05:59
}

/**
 * 结束页用的时长文案，如 312 -> 「5 分 12 秒」。
 * 不足 1 分钟时只说秒。
 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60

  if (minutes === 0)
    return `${seconds} 秒`
  if (seconds === 0)
    return `${minutes} 分`
  return `${minutes} 分 ${seconds} 秒`
}

/**
 * 倒计时显示，固定 mm:ss，两位补零。
 * 负数按 0 处理，避免切后台校正时出现「-01:23」。
 */
export function formatCountdown(remainingSeconds: number): string {
  const s = Math.max(0, Math.floor(remainingSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * 按真实时间差计算剩余秒数。
 *
 * PRD F1 关键实现点：前台用 setInterval 刷显示，但剩余时间一律由
 * Date.now() - startAt 推导，不依赖 interval 累加 —— 否则切后台时
 * interval 被挂起，回前台会少扣时间。
 */
export function remainingSeconds(startAt: number, durationMinutes: number, now: number): number {
  const elapsed = Math.floor((now - startAt) / 1000)
  return Math.max(0, durationMinutes * 60 - elapsed)
}

/** 本次已进行的秒数，用于结束页展示实际时长。 */
export function elapsedSeconds(startAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startAt) / 1000))
}
