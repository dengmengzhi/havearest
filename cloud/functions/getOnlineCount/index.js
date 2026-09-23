const cloud = require('wx-server-sdk')
const { toProvinceList } = require('./aggregate')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

/** PRD F4：在线 = 30 秒内有心跳的用户。心跳每 20 秒一次，留一倍余量。 */
const ONLINE_WINDOW_MS = 30 * 1000

/**
 * 在线人数 + 省份分布。
 *
 * 两次查询而不是一次：
 *   count 统计的是**所有**在线用户，包括 IP 解析不出省份的那些；
 *   分组只统计有 province 的。两个数字不相等是正常的 ——
 *   顶部文案要显示真实总人数，地图只点亮能定位的那部分。
 *
 * 返回的 provinces 不含任何用户标识，聚合后只剩「省份 → 人数」，反推不到具体是谁。
 */
exports.main = async () => {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS)

  try {
    const [totalRes, groupRes] = await Promise.all([
      db.collection('heartbeat').where({ lastSeen: _.gt(since) }).count(),
      db.collection('heartbeat').aggregate().match({ lastSeen: _.gt(since), province: _.exists(true) }).group({ _id: '$province', count: $.sum(1) }).end(),
    ])

    return {
      count: totalRes.total || 0,
      provinces: toProvinceList(groupRes.list),
    }
  }
  catch (err) {
    // 故意**不**降级成 { count: 0 } —— 那样客户端收到的是一次「成功的 0 人」，
    // 会把顶部文案刷成「此刻还没有人在小憩」、地图清空。
    // 抛出去让 callFunction reject，客户端的 catch 才会维持上一次的数字。
    console.error('[getOnlineCount] 查询失败', err && err.message)
    throw err
  }
}
