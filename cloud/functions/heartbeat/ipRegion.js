const IP2Region = require('ip2region').default

/**
 * IP → 省级行政区，基于内置的 ip2region 离线库。
 *
 * **只到省，不要更细**。两个原因：
 *   1. 准确性 —— IP 定位在省级准确率高得多。实测 117.136.0.1（移动）被标到北京，
 *      但移动用户遍布全国，城市级基本是运营商出口而非用户真实位置
 *   2. 隐私 —— 粒度越粗，聚合后越无法反推到个人
 *
 * 选离线库而不是第三方 API：无网络往返、无额度限制、无 key 要管。
 * 代价是包大约 12MB（云函数上限 50MB，放得下）。
 * 实测构造 3ms、1000 次查询 8ms、常驻内存约 +11MB，撑得住每 20 秒一次的心跳。
 */

/**
 * 模块级单例。
 *
 * 构造时要读 8MB 的库文件，**绝不能每次调用都 new** —— 云函数容器会被复用，
 * 单例能跨多次调用存活，只在冷启动时付一次加载成本。
 */
let instance = null

function getInstance() {
  if (!instance)
    instance = new IP2Region()
  return instance
}

/**
 * 已知的 34 个省级行政区。
 *
 * ⚠️ 必须与 src/assets/map/provinces.json 的 key 保持一致 —— 那边查不到坐标就点不亮。
 * 两处重复是有意的：云函数不该反向依赖小程序端的资源文件。
 * test/ipRegion.test.ts 里有一条用例专门校验两边没有漂移。
 */
const KNOWN_PROVINCES = new Set([
  '北京',
  '天津',
  '河北',
  '山西',
  '内蒙古',
  '辽宁',
  '吉林',
  '黑龙江',
  '上海',
  '江苏',
  '浙江',
  '安徽',
  '福建',
  '江西',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '广东',
  '广西',
  '海南',
  '重庆',
  '四川',
  '贵州',
  '云南',
  '西藏',
  '陕西',
  '甘肃',
  '青海',
  '宁夏',
  '新疆',
  '台湾',
  '香港',
  '澳门',
])

/**
 * 把库返回的省份名规整成短名。
 *
 * ip2region 的返回并不统一（实测）：
 *   普通省份带「省」——「浙江省」「贵州省」；台湾也带 ——「台湾省」
 *   直辖市不带 ——「北京」「上海」
 *   自治区已经是短名 ——「新疆」「内蒙古」「广西」「宁夏」「西藏」
 *   港澳也是短名 ——「香港」「澳门」
 * 所以实际只需要削「省」，其余后缀是防御性的，防止库升级后改了格式。
 */
const SUFFIXES = ['维吾尔自治区', '壮族自治区', '回族自治区', '自治区', '特别行政区', '省', '市']

function normalizeProvince(raw) {
  if (!raw || typeof raw !== 'string')
    return null
  let name = raw.trim()
  for (const suffix of SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      name = name.slice(0, -suffix.length)
      break
    }
  }
  return name || null
}

/**
 * 内网 / 回环地址判断。
 *
 * 这是**性能优化而非正确性保护** —— 内网地址即便查库也会被 toProvince 的
 * country 检查挡掉（ip2region 对它们返回 country 为空）。这里提前返回是为了
 * 省掉一次无谓的查库。
 *
 * 独立导出是为了能被单测直接验证 —— 内网段是 172.16~172.31，
 * 边界写宽了会把 172.15 / 172.32 这类真实公网用户当成内网跳过，
 * 他们就永远定位不到、地图上永远不亮。
 * （实测 172.15.0.1 是美国密苏里的真实公网地址。）
 */
function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string')
    return false
  return /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(ip)
}

/**
 * 把 ip2region 的查询结果转成可入库的省份名，拿不准一律返回 null。
 *
 * 与查库分开是为了能直接喂构造数据做单测 —— 这里的两道过滤各有真实场景：
 *
 *   1. country 检查：境外 IP **会**返回非空 province（实测日本→「北海道」、
 *      韩国→「首尔」、德国→「法兰克福」、美国→「密苏里」）。不拦住就会写进库，
 *      而这张图只画中国。
 *   2. 白名单检查：第二道防线，防止库升级后中国境内返回了预期外的行政区名，
 *      脏数据进库后聚合出来的省份在前端查不到坐标、静默不点亮，很难排查。
 */
function toProvince(result) {
  if (!result || typeof result !== 'object')
    return null
  if (result.country !== '中国')
    return null

  const province = normalizeProvince(result.province)
  if (!province || !KNOWN_PROVINCES.has(province))
    return null

  return province
}

/**
 * 解析省份。拿不准一律返回 null —— 地图上不点亮，好过点错地方。
 *
 * 整个函数不会抛错：心跳每 20 秒一次，IP 解析出问题不该让心跳整个失败、
 * 进而让在线人数掉下去。
 */
function resolveProvinceByIp(ip) {
  if (!ip || typeof ip !== 'string')
    return null
  if (isPrivateIp(ip))
    return null

  try {
    return toProvince(getInstance().search(ip))
  }
  catch {
    return null
  }
}

module.exports = { KNOWN_PROVINCES, isPrivateIp, normalizeProvince, resolveProvinceByIp, toProvince }
