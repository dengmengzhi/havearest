/**
 * 上报时长的清洗规则。
 *
 * 单独成文件是为了能直接单测 —— index.js 依赖 wx-server-sdk，在本地跑不起来。
 */

/**
 * 一次小憩最长按 30 分钟计。
 *
 * 时长是客户端算完传上来的，不可信：计时器最长 10 分钟，加上「提示停留 2 秒」
 * 与切后台回前台的校正，正常值远在 30 分钟以内。取这个上限是为了挡住
 * 改包的人往排行榜上刷时长 —— 榜单一旦能被刷，它就没有任何意义了。
 *
 * 与 src/types 的 BACKGROUND_ABANDON_MS（后台 30 分钟视为放弃）同一个数：
 * 超过 30 分钟的会话在客户端本来就不会存在。
 */
const MAX_SESSION_SECONDS = 30 * 60

/**
 * @param {unknown} value 客户端上报的秒数
 * @returns {number} 0 表示这次不该计入
 */
function normalizeSeconds(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0)
    return 0
  // 向下取整：不满一秒的尾巴不计，和本地累计（src/utils/tally.ts）的处理一致
  return Math.min(Math.floor(n), MAX_SESSION_SECONDS)
}

module.exports = { MAX_SESSION_SECONDS, normalizeSeconds }
