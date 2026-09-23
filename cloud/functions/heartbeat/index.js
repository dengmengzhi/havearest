const cloud = require('wx-server-sdk')
const { resolveProvinceByIp } = require('./ipRegion')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 心跳上报。
 *
 * PRD F4：heartbeat 集合 upsert lastSeen，每 20 秒一次，仅前台发送。
 *
 * 省份来自 CLIENTIP 的归属地反查：getWXContext 的 CLIENTIP 是调用上下文自带的，
 * **不需要任何用户授权、不弹窗**，这是在不违反「首次打开无授权弹窗」的前提下
 * 唯一能拿到地域的途径。只到省级，用内置的 ip2region 离线库解析（见 ipRegion.js）。
 */
exports.main = async () => {
  const { OPENID, CLIENTIP, CLIENTIPV6 } = cloud.getWXContext()

  if (!OPENID)
    return { ok: false }

  // 优先用 IPv4：ip2region 的 IPv4 库更准，IPv6 只是纯 IPv6 用户的兜底
  const province = resolveProvinceByIp(CLIENTIP) || resolveProvinceByIp(CLIENTIPV6)

  // lastSeen 必须是 Date 对象，不能是数字时间戳 —— TTL 索引只对 BSON Date 生效，
  // 存成 number 会让 TTL 静默失效，heartbeat 无限增长、在线数随时间虚高
  const data = { _openid: OPENID, lastSeen: new Date() }

  // 解析不出就不写 province，让上一次的值留着：
  // 用户位置不会在 20 秒内变，而 IP 库偶发查不到不该让他从地图上消失
  if (province)
    data.province = province

  try {
    // 用 openid 当 _id，靠 set 做 upsert —— 一个用户只留一条，
    // 不需要先查再决定 add 还是 update
    await db.collection('heartbeat').doc(OPENID).set({ data })
    return { ok: true }
  }
  catch (err) {
    // 集合不存在或权限不对时不要静默成功，否则在线数一直是 0 却查不出原因
    console.error('[heartbeat] 写入失败', err && err.message)
    return { ok: false }
  }
}
