/**
 * 榜单人少时补充的展示数据。
 *
 * ⚠️ **这些是编造的条目，不是真实用户。**
 *
 * 为什么要有：首页在真实在线人数少于 10 时会补数（见 getOnlineCount/ambient.js），
 * 如果排行榜这边只有两三行真人，两个页面就会当场自相矛盾 ——
 * 「此刻 37 人在小憩」配上一张只有 2 个人的榜单，一眼就穿帮。
 *
 * 几条自我约束，比首页那份更严，因为这里造的是「人」而不是一个数字：
 *   1. **只在真实条目少于 AMBIENT_MIN_ROWS 时补**，真人够了自动退场
 *   2. **一天一档**，不是 5 分钟一档 —— 累计时长榜每 5 分钟重排一次是最假的那种
 *   3. **真实条目一条都不动**，补的只是往下叠，名次由合并后统一计算
 *   4. **补出来的时长以真实最高值为锚**（×1.3），不会出现一个真人永远垫底的榜
 *   5. **绝不标记为 mine**，「我」那一行永远来自真实数据
 *
 * 关掉的方式与首页一致：把 AMBIENT_MIN_ROWS 调成 0。
 *
 * 注：hashSeed / seededRandom / 省份权重与 getOnlineCount/ambient.js 重复了一份。
 * 云函数各自独立打包部署，没有共享目录的机制，这里选择重复而不是引入构建步骤。
 */

/** 真实条目少于这个数才补。设为 0 即关闭该功能。 */
const AMBIENT_MIN_ROWS = 12

/** 一天一档。累计时长是只增不减的量，一天之内重排就露馅了。 */
const BUCKET_MS = 24 * 60 * 60 * 1000

/** 没有真实数据可锚定时的时长上限：50 分钟，大约是一天歇五六次的量。 */
const BASE_CEILING_SECONDS = 50 * 60

/** 补出来的最低时长，一次小憩的量。 */
const FLOOR_SECONDS = 3 * 60

/** 省份权重，大致按网民规模排 —— 均匀分布的话西藏和广东一样多，一眼假。 */
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
 * 必须有这一步：线性同余对相邻种子高度相关，种子差 1 时第一个输出只差
 * 约 0.0000078，连续若干档会算出几乎一样的结果。先散列再喂给 LCG 才会散开。
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

/** 线性同余，给定种子产出确定序列 —— 同一天里所有人看到同一份榜。 */
function seededRandom(seed) {
  let state = seed % 2147483647
  if (state <= 0)
    state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

function pickProvince(rand) {
  let pick = rand() * TOTAL_WEIGHT
  for (const [name, weight] of PROVINCE_WEIGHTS) {
    pick -= weight
    if (pick <= 0)
      return name
  }
  return PROVINCE_WEIGHTS[0][0]
}

/**
 * 补充榜单条目。真实条目够多时原样返回，不做任何加工。
 *
 * @param {Array<{province: string, seconds: number, sessions: number, mine: boolean}>} realEntries
 * @param {number} now 时间戳，注入是为了可测
 * @returns {Array<object>} 真实 + 补充，未排序（名次由调用方统一计算）
 */
function padRanking(realEntries, now = Date.now()) {
  const real = Array.isArray(realEntries) ? realEntries : []

  if (AMBIENT_MIN_ROWS <= 0 || real.length >= AMBIENT_MIN_ROWS)
    return real

  const rand = seededRandom(hashSeed(Math.floor(now / BUCKET_MS)))

  // 以真实最高值为锚：真人歇得多时榜单水位跟着抬高，
  // 否则一个认真用了一整天的人会被一群编出来的数字压在最后
  const realMax = real.reduce((max, e) => Math.max(max, Number(e.seconds) || 0), 0)
  const ceiling = Math.max(Math.round(realMax * 1.3), BASE_CEILING_SECONDS)
  const span = Math.max(ceiling - FLOOR_SECONDS, 60)

  const padded = real.slice()
  for (let i = real.length; i < AMBIENT_MIN_ROWS; i++) {
    // 指数 1.6 把分布压向低位：少数人歇得多、多数人歇得少，比均匀分布像真的
    const seconds = FLOOR_SECONDS + Math.round(span * rand() ** 1.6)
    // 对齐到整分钟 —— 真实累计是若干个 3/5/10 分钟会话之和，不会出现零碎秒数
    const rounded = Math.max(FLOOR_SECONDS, Math.round(seconds / 60) * 60)
    // 每次平均 3~10 分钟，反推次数
    const avgSeconds = (3 + rand() * 7) * 60
    padded.push({
      province: pickProvince(rand),
      seconds: rounded,
      sessions: Math.max(1, Math.round(rounded / avgSeconds)),
      // 补出来的条目永远不是「我」
      mine: false,
    })
  }

  return padded
}

module.exports = { AMBIENT_MIN_ROWS, BUCKET_MS, padRanking, PROVINCE_WEIGHTS }
