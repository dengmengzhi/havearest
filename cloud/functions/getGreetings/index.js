const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 取某时段的问候文案候选集，客户端自己按已展示 id 去重。
 *
 * PRD F2：每时段 ≥ 30 条，周末单独 20 条；同一用户当天不重复。
 */
exports.main = async (event) => {
  const slot = typeof event.slot === 'string' ? event.slot : ''

  // TODO(第 3 周): db.collection('greetings').where({ slot, enabled: true }).limit(50).get()
  void db
  void slot

  return { greetings: [] }
}
