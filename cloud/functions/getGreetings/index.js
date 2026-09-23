const cloud = require('wx-server-sdk')
const { SLOTS, pickCandidates } = require('./slots')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/** 一次最多回多少条。客户端只需要从中挑一条，给够候选即可。 */
const FETCH_LIMIT = 50

/**
 * 取某时段的问候文案候选集，客户端自己按已展示 id 去重。
 *
 * PRD F2：每时段 ≥ 30 条，周末单独 20 条；同一用户当天不重复。
 *
 * **excludeIds 只用来排序，不用来过滤**。
 * 早先的实现直接 `nin(excludeIds)`，当天该时段的文案被看完后返回空数组，
 * 客户端顶部就空着 —— 而客户端「耗尽就清空重来」的逻辑是在那个已经空了的
 * 数组上重试的，永远取不到。现在改成把没看过的排在前面、看过的垫底，
 * 保证**任何情况下只要库里有文案就一定返回得出来**。
 */
exports.main = async (event) => {
  const slot = typeof event.slot === 'string' ? event.slot : ''
  const excludeIds = Array.isArray(event.excludeIds) ? event.excludeIds : []

  if (!SLOTS.has(slot))
    return { greetings: [] }

  try {
    const res = await db.collection('greetings')
      .where({ slot, enabled: _.neq(false) })
      .limit(FETCH_LIMIT)
      .get()

    return { greetings: pickCandidates(res.data, excludeIds) }
  }
  catch (err) {
    // 抛出去让客户端回落到内置欢迎语，而不是返回空数组让顶部空着
    console.error('[getGreetings] 查询失败', err && err.message)
    throw err
  }
}
