const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const MAX_BATCH = 50

/**
 * 埋点批量入库。
 *
 * PRD：客户端攒 5 条或 10 秒发一次，onHide 时强制发送。
 * 每条事件补上 openid 与服务端时间戳后写入 events 集合。
 *
 * 本函数即使部分写失败也返回成功 —— 埋点绝不能反过来影响客户端主流程。
 */
exports.main = async (event) => {
  const events = Array.isArray(event.events) ? event.events.slice(0, MAX_BATCH) : []
  const { OPENID } = cloud.getWXContext()

  // TODO(第 4 周): 补 _openid / server_ts 后 db.collection('events').add() 批量写入
  void db
  void OPENID

  return { accepted: events.length }
}
