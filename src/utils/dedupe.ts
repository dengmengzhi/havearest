/**
 * 去重与随机取样。纯函数，不碰 uni API，便于直接单测。
 *
 * 随机源作为参数注入（默认 Math.random），测试里可以替换成确定性实现。
 */

export type RandomSource = () => number

interface HasId { id: string }

/**
 * 从池子里随机取 count 个未出现在 excludeIds 里的条目。
 *
 * 可选条目不足 count 时，返回能取到的全部 —— 由调用方决定要不要重置。
 */
export function takeUnseen<T extends HasId>(
  pool: readonly T[],
  excludeIds: readonly string[],
  count: number,
  random: RandomSource = Math.random,
): T[] {
  const excluded = new Set(excludeIds)
  const candidates = pool.filter(item => !excluded.has(item.id))
  return shuffle(candidates, random).slice(0, Math.max(0, count))
}

/**
 * 取一个未看过的条目。池子已耗尽时返回 null，调用方负责重置已看列表。
 */
export function pickUnseen<T extends HasId>(
  pool: readonly T[],
  excludeIds: readonly string[],
  random: RandomSource = Math.random,
): T | null {
  const picked = takeUnseen(pool, excludeIds, 1, random)
  return picked[0] ?? null
}

/**
 * 追加已看 id 并裁剪到上限，保留最近的。
 * PRD F3 规定 excludeIds 只带最近 200 个，避免请求体无限增长。
 */
export function appendSeen(seen: readonly string[], ids: readonly string[], limit: number): string[] {
  const merged = [...seen, ...ids]
  return merged.length <= limit ? merged : merged.slice(merged.length - limit)
}

/** Fisher-Yates，不改动入参。 */
function shuffle<T>(list: readonly T[], random: RandomSource): T[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
