/**
 * 云开发环境配置。
 *
 * 拿到正式 appid 与环境 id 后，**只改这一处**（外加 src/manifest.json 里的 appid）。
 * 两者为空时，接入层自动降级到 mock（见 index.ts），H5 与小程序端都能跑通 UI。
 */

/** 微信小程序 appid。同时需要填到 src/manifest.json 的 mp-weixin.appid。 */
export const APPID = 'wxc4019689b9f80f28'

/** 微信云开发环境 id。同时需要填到仓库根的 cloudbaserc.json。 */
export const CLOUD_ENV = 'cloudbase-d3gvlqr8m945f5f02'
