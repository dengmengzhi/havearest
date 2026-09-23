import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import provinceCoords from '@/assets/map/provinces.json'

// 云函数是 CommonJS，且不走 @ 别名，这里直接按相对路径加载
const require_ = createRequire(import.meta.url)
const { KNOWN_PROVINCES, isPrivateIp, normalizeProvince, resolveProvinceByIp, toProvince }
  = require_('../cloud/functions/heartbeat/ipRegion.js')

const COORDS = provinceCoords as Record<string, { x: number, y: number }>

describe('省份白名单与坐标表的一致性', () => {
  // 两处各存一份省份列表是有意的（云函数不该反向依赖小程序端资源），
  // 但必须不漂移 —— 任何一边多一个少一个，那个省就永远点不亮
  it('云函数白名单与 provinces.json 完全一致', () => {
    const fromMap = Object.keys(COORDS).sort()
    const fromFn = [...KNOWN_PROVINCES].sort()

    expect(fromFn).toEqual(fromMap)
  })

  it('都是 34 个省级行政区', () => {
    expect(KNOWN_PROVINCES.size).toBe(34)
    expect(Object.keys(COORDS)).toHaveLength(34)
  })
})

describe('省份名规整', () => {
  // ip2region 的返回格式实测并不统一，这里覆盖全部已知形式
  it.each([
    ['浙江省', '浙江'],
    ['贵州省', '贵州'],
    ['台湾省', '台湾'],
    ['北京', '北京'],
    ['上海', '上海'],
    ['新疆', '新疆'],
    ['内蒙古', '内蒙古'],
    ['广西', '广西'],
    ['香港', '香港'],
    ['澳门', '澳门'],
    // 下面这些是防御性的：库升级改了格式也能接住
    ['新疆维吾尔自治区', '新疆'],
    ['广西壮族自治区', '广西'],
    ['宁夏回族自治区', '宁夏'],
    ['内蒙古自治区', '内蒙古'],
    ['西藏自治区', '西藏'],
    ['香港特别行政区', '香港'],
    ['北京市', '北京'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeProvince(raw)).toBe(expected)
  })

  it('规整结果都能在坐标表里查到', () => {
    for (const raw of ['浙江省', '台湾省', '新疆维吾尔自治区', '内蒙古自治区', '香港特别行政区'])
      expect(COORDS, `${raw} 规整后查不到坐标`).toHaveProperty(normalizeProvince(raw) as string)
  })

  it('两侧空白会被去掉', () => {
    expect(normalizeProvince('  四川省  ')).toBe('四川')
  })

  it('异常输入返回 null，不抛错', () => {
    for (const bad of ['', null, undefined, 123, {}])
      expect(normalizeProvince(bad as never)).toBeNull()
  })

  it('不会把名字削成空字符串', () => {
    expect(normalizeProvince('省')).toBe('省')
  })
})

describe('内网地址判断', () => {
  // 直接测被测函数本身，不要在测试里复制一份正则 —— 那样改坏实现测试也不会红
  it.each([
    ['127.0.0.1', true],
    ['10.1.2.3', true],
    ['192.168.1.1', true],
    ['172.16.0.1', true],
    ['172.31.255.255', true],
    // 边界：内网段是 172.16~172.31，写宽了会把真实公网用户当内网跳过
    ['172.15.0.1', false],
    ['172.32.0.1', false],
    ['203.0.113.7', false],
    ['114.114.114.114', false],
  ])('isPrivateIp(%s) === %s', (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected)
  })

  it('对异常输入返回 false 而不是抛错', () => {
    for (const bad of ['', null, undefined, 42])
      expect(isPrivateIp(bad as never)).toBe(false)
  })
})

describe('真实 IP 解析（ip2region 离线库）', () => {
  it.each([
    ['202.96.128.86', '广东'],
    ['114.114.114.114', '江苏'],
    ['223.5.5.5', '浙江'],
    ['119.29.29.29', '北京'],
    ['110.157.0.1', '新疆'],
    ['222.216.0.1', '广西'],
    ['203.66.0.1', '台湾'],
    ['203.198.0.1', '香港'],
    ['202.175.0.1', '澳门'],
  ])('%s → %s', (ip, expected) => {
    expect(resolveProvinceByIp(ip)).toBe(expected)
  })

  it('iPv6 也能解析（纯 IPv6 用户的兜底）', () => {
    expect(resolveProvinceByIp('2409:8c20::1')).toBe('江苏')
  })

  // 境外 IP **会**返回非空 province，不是空值自然过滤 —— 必须靠 country 检查拦住
  it.each([
    ['133.242.0.1', '日本（返回「北海道」）'],
    ['121.135.0.1', '韩国（返回「首尔」）'],
    ['185.60.216.35', '德国（返回「法兰克福」）'],
    ['52.95.110.1', '美国（返回「华盛顿」）'],
    ['172.15.0.1', '美国（返回「密苏里」，且是公网地址不会被内网判断挡掉）'],
    ['8.8.8.8', 'Google'],
    ['2001:4860:4860::8888', 'Google IPv6'],
  ])('境外 IP %s 返回 null —— %s', (ip) => {
    expect(resolveProvinceByIp(ip)).toBeNull()
  })

  it('内网与回环返回 null', () => {
    for (const ip of ['127.0.0.1', '10.0.0.1', '192.168.1.1'])
      expect(resolveProvinceByIp(ip)).toBeNull()
  })

  it('非法输入返回 null 而不是抛错', () => {
    for (const bad of ['not-an-ip', '', null, undefined, 42, {}])
      expect(() => resolveProvinceByIp(bad as never)).not.toThrow()
    for (const bad of ['not-an-ip', '', null, undefined, 42])
      expect(resolveProvinceByIp(bad as never)).toBeNull()
  })

  it('解析结果一定在白名单内，不会写脏数据进库', () => {
    const ips = ['202.96.128.86', '114.114.114.114', '223.5.5.5', '119.29.29.29', '110.157.0.1', '203.66.0.1']
    for (const ip of ips) {
      const p = resolveProvinceByIp(ip)
      expect(KNOWN_PROVINCES.has(p), `${ip} 解析出 ${p}，不在白名单`).toBe(true)
    }
  })
})

describe('toProvince 的两道过滤', () => {
  it('中国境内的正常结果原样规整', () => {
    expect(toProvince({ country: '中国', province: '浙江省', city: '杭州市' })).toBe('浙江')
    expect(toProvince({ country: '中国', province: '北京', city: '北京市' })).toBe('北京')
  })

  // 第一道：境外。构造数据比真实 IP 更直接地锁住这条分支
  it.each([
    ['日本', '北海道'],
    ['韩国', '首尔'],
    ['德国', '法兰克福'],
    ['美国', '密苏里'],
    ['', ''],
  ])('country=%s 一律返回 null，哪怕 province 非空', (country, province) => {
    expect(toProvince({ country, province, city: '' })).toBeNull()
  })

  // 关键用例：境外但省份名**恰好撞上**中国的白名单。
  // 两道过滤平时互为兜底（境外的「北海道」会被白名单挡掉），
  // 只有这种撞名的输入才能单独验证 country 那一道确实在起作用。
  it.each(['北京', '上海', '台湾', '香港'])('country=日本 但 province=%s 仍返回 null', (province) => {
    expect(toProvince({ country: '日本', province, city: '' })).toBeNull()
  })

  // 第二道：白名单。防止库升级后返回预期外的行政区名，脏数据静默入库
  it.each(['火星省', '未知地区', '某某州', 'Zhejiang'])('中国境内但不在白名单的「%s」返回 null', (province) => {
    expect(toProvince({ country: '中国', province, city: '' })).toBeNull()
  })

  it('province 为空或缺失返回 null', () => {
    expect(toProvince({ country: '中国', province: '', city: '内网IP' })).toBeNull()
    expect(toProvince({ country: '中国', city: '' })).toBeNull()
  })

  it('非对象输入返回 null 而不是抛错', () => {
    for (const bad of [null, undefined, '中国', 42, []])
      expect(() => toProvince(bad as never)).not.toThrow()
    for (const bad of [null, undefined, '中国', 42])
      expect(toProvince(bad as never)).toBeNull()
  })
})
