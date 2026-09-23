const cloud = require('wx-server-sdk')
const { buildSource } = require('./source')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 静默登录。
 *
 * PRD F5：openid 由云开发从调用上下文直接取得，**客户端不需要任何授权动作、
 * 不弹窗、不要手机号和头像昵称**。这个函数里也不应该出现任何获取用户资料的调用。
 *
 * 顺带维护 users 集合：首次打开建档，之后每次打开更新 lastOpenAt。
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID)
    return { openid: '', isNew: false }

  const now = Date.now()
  const users = db.collection('users')

  // 先尝试更新：老用户走这条路，一次写操作搞定。
  // 不能直接用 set —— 那是全量覆盖，会把 firstOpenAt / totalSessions / totalSeconds 清掉。
  try {
    const res = await users.doc(OPENID).update({ data: { lastOpenAt: now } })
    if (res && res.stats && res.stats.updated > 0)
      return { openid: OPENID, isNew: false }
  }
  catch {
    // 文档不存在时云开发会报错，落到下面建档
  }

  // 新用户建档。source 只在这里写一次 —— PRD 要的是**首次**来源，
  // 老用户后续从别的渠道进来不该覆盖掉最初的归因
  try {
    await users.doc(OPENID).set({
      data: {
        _openid: OPENID,
        firstOpenAt: now,
        lastOpenAt: now,
        source: buildSource(event && event.scene, event && event.channel),
        totalSessions: 0,
        totalSeconds: 0,
      },
    })
    return { openid: OPENID, isNew: true }
  }
  catch (err) {
    // 并发下两个请求可能都判定为新用户，后一个 set 会覆盖前一个。
    // 两次写的 firstOpenAt 相差毫秒级，影响可忽略，但不能因此让登录失败 ——
    // openid 本身是从上下文拿的，建档失败不影响它可用
    console.error('[login] 建档失败', err && err.message)
    return { openid: OPENID, isNew: true }
  }
}
