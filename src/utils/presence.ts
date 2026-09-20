import { PRESENCE_EXACT_THRESHOLD } from '@/types'

export interface PresenceLabel {
  text: string
  /** 是否展示了具体数字，对应埋点 online_show 的 shown 字段 */
  shown: boolean
}

/**
 * 在线人数文案。
 *
 * PRD F4：N < 5 时不显示具体数字，改用保底文案 —— 人少的时候露出真实数字
 * 反而会强化「只有我一个人」。
 *
 * 对外文案统一用「小憩」：提审前清单要求全站无违禁字样，见 scripts/check-forbidden.mjs（R1）。
 */
export function resolvePresenceLabel(count: number): PresenceLabel {
  const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0

  if (safe < PRESENCE_EXACT_THRESHOLD)
    return { text: '此刻有几个人也在歇着', shown: false }

  return { text: `此刻 ${safe} 人在小憩`, shown: true }
}
