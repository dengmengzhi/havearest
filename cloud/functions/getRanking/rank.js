/**
 * 榜单的组装与名次计算。
 *
 * 单独成文件是为了能直接单测 —— index.js 依赖 wx-server-sdk，在本地跑不起来。
 *
 * ⚠️ **这里也是脱敏的最后一道关卡。** 聚合查询必须带上 `_id`（它就是 openid）
 * 才能认出哪一行是「我」，但 `_id` 绝不能下发到客户端 —— 否则榜单就成了
 * 一份「谁在什么省、歇了多久」的名单。出口只留 province / seconds / sessions / rank / mine。
 */

/** 榜单取前多少名。20 条一屏多一点，再多就没人往下看了 */
const TOP_LIMIT = 20

/**
 * 把一组已排好序的条目标上名次。
 * 并列同名次、下一名跳号（1、2、2、4），和体育赛事的记法一致。
 */
function assignRanks(sorted) {
  const out = []
  sorted.forEach((entry, i) => {
    const prev = out[i - 1]
    out.push({
      ...entry,
      rank: prev && prev.seconds === entry.seconds ? prev.rank : i + 1,
    })
  })
  return out
}

/** 累计时长降序；相同则按次数多的在前，再相同按省名，只为结果稳定不抖。 */
function compare(a, b) {
  if (a.seconds !== b.seconds)
    return b.seconds - a.seconds
  if (a.sessions !== b.sessions)
    return b.sessions - a.sessions
  if (a.province === b.province)
    return 0
  return a.province < b.province ? -1 : 1
}

/** 把 users 集合的文档转成榜单条目，顺手丢掉脏数据。 */
function toEntry(doc, openid) {
  const seconds = Number(doc && doc.totalSeconds)
  if (!Number.isFinite(seconds) || seconds <= 0)
    return null

  const sessions = Number(doc.totalSessions)
  return {
    // 省份解析不出来时留空串，页面上显示「某处」—— 不点亮好过点错
    province: typeof doc.province === 'string' ? doc.province : '',
    seconds: Math.floor(seconds),
    sessions: Number.isFinite(sessions) && sessions > 0 ? Math.floor(sessions) : 0,
    mine: !!openid && doc._id === openid,
  }
}

/**
 * 组装榜单。
 *
 * 传进来的是**已经脱敏过的条目**（toEntry 的产物），不是原始文档 ——
 * 补数（ambient.js）要在排名之前介入，所以文档转条目那一步留在 index.js。
 *
 * @param {Array<object>} entries 条目，顺序无关
 * @param {object|null} myEntry 我那一条，可能没建档或没歇过
 * @param {number} aboveCount 累计时长严格多于我的人数，仅在我没进榜时用来算名次
 * @returns {{entries: Array<object>, mine: object|null}} 榜单与我那一行
 */
function buildRanking(entries, myEntry, aboveCount) {
  const list = Array.isArray(entries) ? entries : []
  const ranked = assignRanks([...list].sort(compare)).slice(0, TOP_LIMIT)

  const inTop = ranked.find(e => e.mine) || null
  if (inTop)
    return { entries: ranked, mine: inTop }

  if (!myEntry)
    return { entries: ranked, mine: null }

  // 没进榜时单独给出我的名次：比我多的人数 + 1 —— 并列算同一名，
  // 和 assignRanks 的跳号记法对得上
  const above = Number.isFinite(aboveCount) && aboveCount > 0 ? Math.floor(aboveCount) : 0
  return { entries: ranked, mine: { ...myEntry, rank: above + 1 } }
}

module.exports = { assignRanks, buildRanking, compare, TOP_LIMIT, toEntry }
