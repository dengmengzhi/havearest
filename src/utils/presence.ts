export interface PresenceLabel {
  text: string
  /** 是否展示了具体数字。保留该字段是为了埋点 online_show 的 shown 维度 */
  shown: boolean
}

/**
 * 在线人数文案。
 *
 * PRD F4 原本规定「N < 5 时不显示具体数字，改用保底文案」，理由是人少时
 * 露出真实数字会强化「只有我一个人」。**该规则已按需求移除**（2026-09-23）：
 * 现在一律显示真实人数，配合地图上的城市光点一起呈现。
 *
 * 对外文案统一用「小憩」，见 scripts/check-forbidden.mjs（R1）。
 */
export function resolvePresenceLabel(count: number): PresenceLabel {
  const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0

  if (safe === 0)
    return { text: '此刻还没有人在小憩', shown: true }

  return { text: `此刻 ${safe} 人在小憩`, shown: true }
}
