import type { AnalyticsPayload } from '@/constants/events'

/**
 * 埋点上报。
 *
 * PRD 非功能·稳定性：埋点调用全部 try/catch，失败静默，不影响主流程。
 * 因此本函数**永不抛错、永不 reject**，调用处不需要自己包 try/catch。
 *
 * 本轮（脚手架）只落兜底空实现。PRD 排期里的批量策略 —— 攒 5 条或 10 秒发一次、
 * onHide 时强制发送 —— 留到第 4 周随 track 云函数一起做。
 */
export function track(payload: AnalyticsPayload): void {
  try {
    // TODO(第 4 周): 入队 + 攒批 + onHide 强发，经 cloud/api.ts 的 track 云函数上报
    if (import.meta.env.DEV) {
      // 开发期把事件打出来，便于确认埋点确实被触发过。
      // 仅 DEV 分支，构建产物里不会保留。
      // eslint-disable-next-line no-console
      console.info('[track]', payload.event, payload)
    }
  }
  catch {
    // 埋点失败必须静默
  }
}
