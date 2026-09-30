const cloud = require('wx-server-sdk')
const { padRanking } = require('./ambient')
const { buildRanking, TOP_LIMIT, toEntry } = require('./rank')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 累计小憩时长排行榜。
 *
 * 数据来自 users.totalSeconds / totalSessions，由 finishSession 累加；
 * province 由 heartbeat 在每次打开的第一跳写入（IP 解析只有云函数侧做得到）。
 *
 * 下发的条目里**没有任何身份字段** —— openid 只在本函数内部用来认出「我」那一行，
 * 脱敏在 rank.js 的 toEntry 里完成。省份是唯一的标识信息，粒度只到省。
 */
exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const users = db.collection('users')

  try {
    const [topRes, myRes] = await Promise.all([
      users
        .aggregate()
        .match({ totalSeconds: _.gt(0) })
        .sort({ totalSeconds: -1 })
        .limit(TOP_LIMIT)
        // _id 必须留着，它就是 openid，用来认出「我」那一行；rank.js 负责在出口剥掉
        .project({ province: 1, totalSeconds: 1, totalSessions: 1 })
        .end(),
      // 没建档、没歇过都属正常，查不到就当没有 —— 不该因此让整张榜打不开
      OPENID ? users.doc(OPENID).get().catch(() => null) : Promise.resolve(null),
    ])

    const realEntries = (topRes.list || []).map(doc => toEntry(doc, OPENID)).filter(Boolean)
    const myDoc = pickDoc(myRes)
    const myEntry = toEntry(myDoc && { ...myDoc, _id: OPENID }, OPENID)

    // 真人少时补展示条目 —— 详见 ambient.js 顶部的说明与自我约束。
    // 补数生效时真人总数必然少于 TOP_LIMIT，我那一行一定在榜内，aboveCount 用不上
    const entries = padRanking(realEntries)

    // 只在我确实没进榜时才多查一次：这条查询对大表不便宜，能省则省
    let aboveCount = 0
    let fallback = myEntry
    if (myEntry && !entries.some(e => e.mine)) {
      const above = await countAbove(users, myEntry.seconds)
      // 名次算不出来就干脆不显示我那一行 —— 兜底成「第 1 名」是在编造
      if (above === null)
        fallback = null
      else
        aboveCount = above
    }

    return buildRanking(entries, fallback, aboveCount)
  }
  catch (err) {
    // 和 getOnlineCount 同样的理由：不降级成空榜单。
    // 空榜单是一次「成功的空」，客户端会把它当事实渲染出来，
    // 而真相只是这次没查成 —— 抛出去让客户端保留上一次的结果
    console.error('[getRanking] 查询失败', err && err.message)
    throw err
  }
}

/** doc().get() 在不同版本里回的是对象或单元素数组，两种都接住。 */
function pickDoc(res) {
  if (!res || !res.data)
    return null
  return Array.isArray(res.data) ? res.data[0] || null : res.data
}

/** @returns {number|null} null 表示没查成，调用方据此放弃显示名次而不是编一个 */
async function countAbove(users, seconds) {
  try {
    const res = await users.where({ totalSeconds: _.gt(seconds) }).count()
    return res.total || 0
  }
  catch {
    return null
  }
}
