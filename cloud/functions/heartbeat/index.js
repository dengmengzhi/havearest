const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 心跳上报。
 *
 * PRD F4：heartbeat 集合 upsert last_seen，每 20 秒一次，仅前台发送。
 * last_seen 一律用服务端时间，不信客户端时间戳（客户端时钟可能不准）。
 * 集合需建 TTL 索引 60 秒自动清理。
 */
exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  // TODO(第 4 周): upsert { _id: OPENID, _openid: OPENID, lastSeen: new Date() }
  //   lastSeen 必须是 Date 对象，不能是数字时间戳 —— TTL 索引只对 BSON Date 生效，
  //   存成 number 会让 TTL 静默失效，heartbeat 无限增长、在线数虚高。
  void db
  void OPENID

  return { ok: true }
}
