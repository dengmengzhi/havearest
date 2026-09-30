const cloud = require('wx-server-sdk')
const { normalizeSeconds } = require('./session')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 一次小憩结束后累加到用户档案。
 *
 * users.totalSessions / totalSeconds 在 login 建档时置 0，之前一直没有人往上加 ——
 * 排行榜要的就是这两个数，所以补上这个函数。
 *
 * 用 _.inc 而不是「读出来加一再写回」：后者在并发下会丢更新，
 * 而同一个人同时结束两次小憩虽然少见（比如两台设备），丢了就是永久丢了。
 *
 * 失败不抛给客户端：结束页的累计数字以本地为准（src/utils/tally.ts），
 * 这里只是同步一份到云端，不该因为它失败而打断用户。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID)
    return { ok: false }

  const seconds = normalizeSeconds(event && event.seconds)
  if (seconds <= 0)
    return { ok: false }

  try {
    const res = await db.collection('users').doc(OPENID).update({
      data: {
        totalSessions: _.inc(1),
        totalSeconds: _.inc(seconds),
        lastSessionAt: Date.now(),
      },
    })
    // 文档不存在时 update 不报错、只是更新了 0 条 —— 说明 login 建档没成功过。
    // 这里不补建档：source / firstOpenAt 该由 login 负责，在这儿补会写出一份残档
    return { ok: !!(res && res.stats && res.stats.updated > 0) }
  }
  catch (err) {
    console.error('[finishSession] 累加失败', err && err.message)
    return { ok: false }
  }
}
