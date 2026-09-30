const cloud = require('wx-server-sdk')
const { toProvinceList } = require('./aggregate')
const { padWithAmbient } = require('./ambient')

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
    // 今天零点。用服务端时区，客户端时钟不可信
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    const [totalRes, groupRes, todayRes] = await Promise.all([
      db.collection('heartbeat').where({ lastSeen: _.gt(since) }).count(),
      db.collection('heartbeat').aggregate().match({ lastSeen: _.gt(since), province: _.exists(true) }).group({ _id: '$province', count: $.sum(1) }).end(),
      // 今日来过的人数。lastOpenAt 由 login 云函数每次打开时更新，是毫秒时间戳。
      // 单独 catch：这只是个锦上添花的数字，users 集合没建好或权限不对时
      // 不该把在线人数一起带崩 —— 这正是本函数上一版翻车的方式
      db.collection('users').where({ lastOpenAt: _.gte(dayStart.getTime()) }).count().catch(() => ({ total: 0 })),
    ])

    // 真实人数少时补展示数据 —— 详见 ambient.js 顶部的说明与自我约束。
    // 真人多起来后自动退场，把 AMBIENT_THRESHOLD 调成 0 即彻底关闭
    const padded = padWithAmbient(totalRes.total || 0, toProvinceList(groupRes.list))

    // 今日累计不可能少于此刻在线 —— 这在真实数据下本来就成立，
    // 而补数生效时它还挡住了「此刻 37 人、今天 1 人」这种一眼假的矛盾
    const todayCount = Math.max(todayRes.total || 0, padded.count)

    return { ...padded, todayCount }
  }
  catch (err) {
    // 故意**不**降级成 { count: 0 } —— 那样客户端收到的是一次「成功的 0 人」，
    // 会把顶部文案刷成「此刻还没有人在小憩」、地图清空。
    // 抛出去让 callFunction reject，客户端的 catch 才会维持上一次的数字。
    console.error('[getOnlineCount] 查询失败', err && err.message)
    throw err
  }
}
