/**
 * 来源字符串的组装与校验。单独成文件是为了能直接单测。
 *
 * PRD：首次来源 = scene 值 + 分享参数中的渠道码（如 ch=grp1），
 * 用于区分熟人渠道与陌生渠道。格式 `${scene}` 或 `${scene}:${channel}`。
 */

/** 渠道码来自小程序码参数，是外部输入，必须限长限字符后才入库。 */
const CHANNEL_MAX = 24
const CHANNEL_PATTERN = /^[\w-]+$/

function buildSource(scene, channel) {
  const s = Number(scene)
  const safeScene = Number.isFinite(s) && s >= 0 ? String(Math.floor(s)) : '0'

  if (typeof channel !== 'string')
    return safeScene

  const trimmed = channel.trim()
  if (!trimmed || trimmed.length > CHANNEL_MAX || !CHANNEL_PATTERN.test(trimmed))
    return safeScene

  return `${safeScene}:${trimmed}`
}

module.exports = { CHANNEL_MAX, buildSource }
