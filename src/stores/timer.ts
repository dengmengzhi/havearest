import type { DurationMinutes, TimerEndReason, TimerStatus } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { BACKGROUND_ABANDON_MS, DEFAULT_DURATION, MAX_AGAIN_COUNT } from '@/types'
import { elapsedSeconds, formatCountdown, remainingSeconds } from '@/utils/time'

/**
 * 计时器。状态机与迁移规则见设计文档 2.2。
 *
 * 放在 store 而不是组件里，是因为它跨组件跨页面：伪装层停留期间要继续计时、
 * 切后台回前台要按真实时间差校正、结束页要读到实际时长。
 */
export const useTimerStore = defineStore('timer', () => {
  const status = ref<TimerStatus>('idle')
  const duration = ref<DurationMinutes>(DEFAULT_DURATION)
  const startAt = ref(0)
  const againCount = ref(0)
  const endReason = ref<TimerEndReason | null>(null)
  /** 由 tick 驱动，只为触发重算，不参与剩余时间的计算本身 */
  const now = ref(Date.now())

  const isRunning = computed(() => status.value === 'running')

  const remaining = computed(() =>
    isRunning.value ? remainingSeconds(startAt.value, duration.value, now.value) : duration.value * 60,
  )

  const countdownText = computed(() => formatCountdown(remaining.value))

  const elapsed = computed(() => (startAt.value ? elapsedSeconds(startAt.value, now.value) : 0))

  /** PRD F1：本次会话最多再歇 2 次，达到上限后结束页不再显示该按钮。 */
  const canRestAgain = computed(() => againCount.value < MAX_AGAIN_COUNT)

  function start(minutes: DurationMinutes = duration.value): void {
    duration.value = minutes
    startAt.value = Date.now()
    now.value = startAt.value
    endReason.value = null
    status.value = 'running'
    // TODO(下一轮): 启动 setInterval 驱动 now；埋点 timer_start
  }

  function finish(reason: TimerEndReason): void {
    // 先按真实时间定格，否则结束页读到的是上一次 tick 的旧值
    now.value = Date.now()
    endReason.value = reason
    status.value = reason === 'background' ? 'abandoned' : 'finished'
    // TODO(下一轮): 停止 interval；埋点 timer_end（actualSeconds = elapsed）
  }

  /** 到点：先进入提示态，2 秒后由页面跳转结束页（PRD F1，无声音无振动）。 */
  function notifyTimeout(): void {
    status.value = 'notifying'
  }

  function again(): void {
    if (!canRestAgain.value)
      return
    againCount.value += 1
    start(duration.value)
    // TODO(下一轮): 埋点 timer_choice（choice=again）
  }

  /**
   * 回到前台时校正。
   *
   * 剩余时间一律由 Date.now() - startAt 推导，不依赖 interval 累加 ——
   * interval 在后台会被挂起，累加法回前台会少扣时间（PRD F1 验收第 2 条）。
   * 后台超过 30 分钟视为本次结束（PRD F1 边界）。
   */
  function syncFromBackground(hiddenAt: number): void {
    now.value = Date.now()
    if (status.value !== 'running')
      return

    if (now.value - hiddenAt >= BACKGROUND_ABANDON_MS) {
      finish('background')
      return
    }

    if (remaining.value <= 0)
      notifyTimeout()
  }

  function tick(): void {
    now.value = Date.now()
  }

  function reset(): void {
    status.value = 'idle'
    duration.value = DEFAULT_DURATION
    startAt.value = 0
    againCount.value = 0
    endReason.value = null
  }

  return {
    status,
    duration,
    startAt,
    againCount,
    endReason,
    isRunning,
    remaining,
    countdownText,
    elapsed,
    canRestAgain,
    start,
    finish,
    notifyTimeout,
    again,
    syncFromBackground,
    tick,
    reset,
  }
})
