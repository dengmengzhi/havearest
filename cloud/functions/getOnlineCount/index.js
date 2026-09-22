const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/** PRD F4：在线 = 30 秒内有心跳的用户。 */
const ONLINE_WINDOW_MS = 30 * 1000

exports.main = async () => {
  // TODO(第 4 周): db.collection('heartbeat')
  //   .where({ lastSeen: db.command.gt(new Date(Date.now() - ONLINE_WINDOW_MS)) })
  //   .count()
  void db
  void ONLINE_WINDOW_MS

  return { count: 0 }
}
