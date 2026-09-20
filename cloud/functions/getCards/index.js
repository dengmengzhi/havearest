const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const MAX_EXCLUDE = 200
const DEFAULT_LIMIT = 20

/**
 * 随机取若干张未看过的卡片。
 *
 * PRD F3：接收 excludeIds（最近 200 个），随机取 20 张。
 * 全部看完后重置 —— 由 exhausted 标记通知客户端同步清空本地已看列表。
 */
exports.main = async (event) => {
  const excludeIds = Array.isArray(event.excludeIds) ? event.excludeIds.slice(-MAX_EXCLUDE) : []
  const limit = Number(event.limit) > 0 ? Math.min(Number(event.limit), DEFAULT_LIMIT) : DEFAULT_LIMIT

  // TODO(第 2~3 周): 用聚合 $.sample 随机取样，条件 _id not in excludeIds
  //   const res = await db.collection('cards').aggregate()
  //     .match({ _id: db.command.nin(excludeIds) })
  //     .sample({ size: limit })
  //     .end()
  //   取不到时清空 excludeIds 重取一轮，并置 exhausted = true
  void db
  void excludeIds
  void limit

  return { cards: [], exhausted: false }
}
