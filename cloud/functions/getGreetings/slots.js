/**
 * 时段与候选集整理。单独成文件是为了能直接单测 —— 云函数其余部分依赖 wx-server-sdk。
 */

/**
 * 合法时段，与 src/types/index.ts 的 TimeSlot 一一对应。
 * 拦住非法值，避免把 `slot: undefined` 这类查询打到数据库上做全表扫描。
 */
const SLOTS = new Set(['earlyMorning', 'morning', 'noon', 'afternoon', 'evening', 'night', 'weekend'])

/**
 * 整理候选集：没看过的排前面，看过的垫底，不丢弃任何一条。
 *
 * 关键在「不丢弃」—— 客户端拿到的永远是非空数组（只要库里有），
 * 它按顺序挑第一条没看过的即可；全看过时也还有东西可显示，
 * 不至于顶部空着。
 *
 * @param {Array<{_id: string, slot: string, text: string}>} docs 数据库返回的文档
 * @param {string[]} excludeIds 客户端当天已展示的 id
 */
function pickCandidates(docs, excludeIds) {
  if (!Array.isArray(docs))
    return []

  const seen = new Set(Array.isArray(excludeIds) ? excludeIds : [])

  const valid = docs
    .filter(d => d && typeof d._id === 'string' && d._id && typeof d.text === 'string' && d.text.trim())
    .map(d => ({ id: d._id, slot: d.slot, text: d.text.trim() }))

  const fresh = valid.filter(g => !seen.has(g.id))
  const stale = valid.filter(g => seen.has(g.id))

  return [...fresh, ...stale]
}

module.exports = { FETCH_LIMIT: 50, SLOTS, pickCandidates }
