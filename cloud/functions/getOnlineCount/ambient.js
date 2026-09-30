/**
 * 人少时补充的展示数据。
 *
 * ⚠️ **这是编造的数字，不是真实在线用户。**
 *
 * 为什么要有：冷启动期真实在线常常只有 1 个人（就是打开的人自己）。
 * 看到「此刻 1 人在小憩」反而强化了「只有我一个」，与产品想给的陪伴感背道而驰 ——
 * PRD F4 原本用「此刻有几个人也在歇着」这种模糊文案回避，后来按需求改成显示真实数字，
 * 于是问题又回来了。这里用补数的方式解决。
 *
 * 几条自我约束，都是为了不被戳穿：
 *   1. **只在真实人数少于 AMBIENT_THRESHOLD 时补**，真人起来后自动退场
 *   2. **同一分钟内结果恒定**，同一时刻不同用户看到同一个数 —— 否则两个人一对比就露馅
 *   3. **数字只增不减地围绕基线小幅波动**，不会上一秒 40 下一秒 8
 *   4. **真实用户的省份永远保留**，补的省份只是叠加上去
 *   5. 基线按时段走，午休高、深夜低 —— 深夜显示 40 人在线是假得最明显的那种
 *
 * 真实日活起来后把 AMBIENT_THRESHOLD 调成 0 即可彻底关闭，不需要改其它代码。
 */

/** 真实在线低于这个数才补。设为 0 即关闭该功能。 */
const AMBIENT_THRESHOLD = 10

/** 多久换一次数。5 分钟比每分钟更像真实波动，也让同时打开的人看到同一个数。 */
const BUCKET_MS = 5 * 60 * 1000

/**
 * 各时段的人数基线 [最少, 最多]。
 * 贴着目标用户的作息：午休和下午三四点是高峰，深夜几乎没人。
 */
const HOURLY_BASELINE = [
  [2, 6],
  [1, 4],
  [1, 3],
  [1, 3],
  [1, 4],
  [2, 6], // 0~5 深夜
  [4, 9],
  [8, 16],
  [14, 26],
  [22, 38],
  [26, 44],
  [24, 40], // 6~11 早间到上午
  [30, 52],
  [32, 55],
  [28, 46],
  [30, 50],
  [26, 44],
  [20, 36], // 12~17 午休与下午
  [16, 30],
  [14, 26],
  [12, 24],
  [10, 20],
  [8, 16],
  [5, 11], // 18~23 晚间
]

/**
 * 省份权重，大致按网民规模排。
 * 不用均匀分布 —— 那样西藏和广东一样亮，一眼假。
 */
const PROVINCE_WEIGHTS = [
  ['广东', 12],
  ['江苏', 7],
  ['浙江', 7],
  ['山东', 6],
  ['河南', 6],
  ['四川', 6],
  ['北京', 5],
  ['上海', 5],
  ['河北', 5],
  ['湖北', 4],
  ['湖南', 4],
  ['福建', 4],
  ['安徽', 4],
  ['陕西', 3],
  ['辽宁', 3],
  ['江西', 3],
  ['重庆', 2],
  ['广西', 2],
  ['山西', 2],
  ['云南', 2],
  ['黑龙江', 2],
  ['吉林', 1],
  ['贵州', 1],
  ['天津', 1],
  ['内蒙古', 1],
  ['新疆', 1],
  ['甘肃', 1],
]

const TOTAL_WEIGHT = PROVINCE_WEIGHTS.reduce((n, [, w]) => n + w, 0)

/**
 * 把种子打散。
 *
 * 必须有这一步：线性同余对相邻种子高度相关 —— 种子差 1，第一个输出只差
 * 16807/2^31 ≈ 0.0000078，算出来的人数会一直卡在同一个值上（实测连续 12 档都是 37）。
 * 先散列再喂给 LCG，相邻档位才会落到不同的数。
 */
function hashSeed(n) {
  let h = n | 0
  h = (h ^ 61) ^ (h >>> 16)
  h = h + (h << 3)
  h = h ^ (h >>> 4)
  h = Math.imul(h, 0x27D4EB2D)
  h = h ^ (h >>> 15)
  return (h >>> 0) || 1
}

/** 线性同余，给定种子产出确定序列 —— 同一档内所有人算出同一组数。 */
function seededRandom(seed) {
  let state = seed % 2147483647
  if (state <= 0)
    state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/**
 * 补充展示数据。真实人数达标时原样返回，不做任何加工。
 *
 * @param {number} realCount 真实在线人数
 * @param {Array<{province: string, count: number}>} realProvinces 真实省份分布
 * @param {number} now 时间戳，注入是为了可测
 */
function padWithAmbient(realCount, realProvinces, now = Date.now()) {
  const real = Number.isFinite(realCount) ? Math.max(0, Math.floor(realCount)) : 0
  const provinces = Array.isArray(realProvinces) ? realProvinces : []

  if (real >= AMBIENT_THRESHOLD)
    return { count: real, provinces }

  const date = new Date(now)
  const hour = date.getHours()
  const [lo, hi] = HOURLY_BASELINE[hour] || [5, 12]

  // 5 分钟一档而不是每分钟：真实在线人数不会每分钟大幅跳动，
  // 档位太密反而显得假。同一档内所有人看到同一个数
  const bucket = Math.floor(now / BUCKET_MS)
  const rand = seededRandom(hashSeed(bucket))

  const target = lo + Math.floor(rand() * (hi - lo + 1))
  const padCount = Math.max(0, target - real)
  if (padCount === 0)
    return { count: real, provinces }

  // 真实省份先入表，补的量再往上叠 —— 真人所在的省不能被挤掉
  const merged = new Map()
  for (const p of provinces) {
    if (p && typeof p.province === 'string' && p.count > 0)
      merged.set(p.province, p.count)
  }

  for (let i = 0; i < padCount; i++) {
    let pick = rand() * TOTAL_WEIGHT
    for (const [name, weight] of PROVINCE_WEIGHTS) {
      pick -= weight
      if (pick <= 0) {
        merged.set(name, (merged.get(name) || 0) + 1)
        break
      }
    }
  }

  return {
    count: target,
    provinces: [...merged.entries()]
      .map(([province, count]) => ({ province, count }))
      .sort((a, b) => b.count - a.count),
  }
}

module.exports = { AMBIENT_THRESHOLD, BUCKET_MS, HOURLY_BASELINE, PROVINCE_WEIGHTS, padWithAmbient }
