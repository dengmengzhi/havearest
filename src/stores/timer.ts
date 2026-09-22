import type { DurationMinutes, TimerEndReason, TimerStatus } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { BACKGROUND_ABANDON_MS, DEFAULT_DURATION, MAX_AGAIN_COUNT } from '@/types'
import { elapsedSeconds, formatCountdown, remainingSeconds } from '@/utils/time'

/**
 * 刷新间隔。
 *
 * 取 500ms 而不是 1000ms：剩余时间一律由 Date.now() 推导，interval 只负责触发重算，
 * 所以归零的检测最多滞后一个间隔。用 1000ms 时误差正好卡在 PRD F1 验收的
 * 「误差 ≤ 1 秒」边界上，取一半留出余量。
 *
 * 同一秒内多跑一次几乎没有开销：countdownText 是 computed，值没变就不会触发重渲染。
 */
const TICK_INTERVAL_MS = 500

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

  let tickTimer: ReturnType<typeof setInterval> | null = null

  const isRunning = computed(() => status.value === 'running')

  /**
   * 剩余秒数。
   *
   * 三段而不是两段：idle 时显示待选时长的满值，running 时按真实时间推导，
   * 其余（notifying / finished / abandoned）一律是 0 —— 计时已经走完了。
   * 如果这里只判断 isRunning，到点进入 notifying 的瞬间会跳回满值，
   * 提示的那 2 秒用户会看到倒计时「复活」。
   */
  const remaining = computed(() => {
    if (status.value === 'idle')
      return duration.value * 60
    if (status.value === 'running')
      return remainingSeconds(startAt.value, duration.value, now.value)
    return 0
  })

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
    startTick()
    // TODO(下一轮): 埋点 timer_start
  }

  /**
   * 启动刷新。
   *
   * interval 只做两件事：更新 now 触发重算、检测归零。它**不累加**剩余时间 ——
   * 后台时 interval 会被挂起或节流，累加法回到前台就会少扣时间（PRD F1 验收第 2 条）。
   */
  function startTick(): void {
    stopTick()
    tickTimer = setInterval(() => {
      now.value = Date.now()
      if (status.value === 'running' && remaining.value <= 0)
        notifyTimeout()
    }, TICK_INTERVAL_MS)
  }

  /** 页面卸载时必须调用，否则 interval 会一直留着。 */
  function stopTick(): void {
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }

  function finish(reason: TimerEndReason): void {
    // 按真实时间定格，否则结束页读到的是上一次 tick 的旧值。
    // 但 notifying 说明到点时已经定格过了 —— 提示停留的那 2 秒不属于本次小憩，
    // 再刷新一次会把它算进实际时长（3 分钟的计时会显示成「3 分 2 秒」）。
    if (status.value !== 'notifying')
      now.value = Date.now()

    endReason.value = reason
    status.value = reason === 'background' ? 'abandoned' : 'finished'
    stopTick()
    // TODO(下一轮): 埋点 timer_end（actualSeconds = elapsed）
  }

  /**
   * 到点：先进入提示态，由页面浮出提示行、2 秒后跳转结束页（PRD F1，无声音无振动）。
   * 时长在这里定格，提示的那 2 秒不计入本次时长。
   */
  function notifyTimeout(): void {
    now.value = Date.now()
    status.value = 'notifying'
    stopTick()
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

    if (remaining.value <= 0) {
      notifyTimeout()
      return
    }

    // 后台期间 interval 可能被挂起或清掉，回前台重新拉起，否则倒计时会停住不动
    startTick()
  }

  function tick(): void {
    now.value = Date.now()
  }

  function reset(): void {
    stopTick()
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
    stopTick,
    reset,
  }
})
