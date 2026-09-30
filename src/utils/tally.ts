/**
 * 累计小憩次数与时长。
 *
 * 借的是敲木鱼那类产品的机制：单次结果用完就忘，累计值才给人「再来一次」的理由。
 * PRD 的 users 集合本来就有 totalSessions / totalSeconds 两个字段，
 * 只是一直没往里写、也没展示过。
 *
 * **以本地为准**：结束页是主流程的最后一屏，不该因为网络慢就空着。
 * 云端那份由 finishSession 云函数同步维护，用于后台看数，不阻塞展示。
 */

export interface Tally {
  sessions: number
  seconds: number
}

export const EMPTY_TALLY: Tally = { sessions: 0, seconds: 0 }

/**
 * 累加一次小憩。
 *
 * 只有真正计过时的才算数 —— 秒数为 0 说明没开始就到了结束页，
 * 计进去会让「第 N 次」虚高，用户自己心里有数。
 */
export function addSession(current: Tally, seconds: number): Tally {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  if (safe === 0)
    return normalizeTally(current)

  const base = normalizeTally(current)
  return { sessions: base.sessions + 1, seconds: base.seconds + safe }
}

/** 本地存储可能被改坏或读出脏值，用之前先夹一遍。 */
export function normalizeTally(value: unknown): Tally {
  if (!value || typeof value !== 'object')
    return { ...EMPTY_TALLY }

  const v = value as Partial<Tally>
  return {
    sessions: Number.isFinite(v.sessions) ? Math.max(0, Math.floor(v.sessions as number)) : 0,
    seconds: Number.isFinite(v.seconds) ? Math.max(0, Math.floor(v.seconds as number)) : 0,
  }
}

/**
 * 累计时长的文案，如「1 小时 23 分」。
 *
 * 和单次时长（formatDuration）分开：单次要精确到秒，累计到秒反而显得琐碎 ——
 * 攒了三小时零八秒，那个八秒没有任何意义。
 */
export function formatTotal(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0

  if (s < 60)
    return `${s} 秒`

  const minutes = Math.floor(s / 60)
  if (minutes < 60)
    return `${minutes} 分`

  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes === 0 ? `${hours} 小时` : `${hours} 小时 ${restMinutes} 分`
}

/**
 * 结束页那行累计文案。
 *
 * 第一次就不提累计了 —— 「这是你第 1 次」是句废话，
 * 而且新用户此刻还不需要被数字追着。
 */
export function formatTallyLine(tally: Tally): string {
  const t = normalizeTally(tally)
  if (t.sessions <= 1)
    return ''

  return `第 ${t.sessions} 次小憩，一共歇了 ${formatTotal(t.seconds)}`
}
