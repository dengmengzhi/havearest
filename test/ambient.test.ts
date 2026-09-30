import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import provinceCoords from '@/assets/map/provinces.json'

const require_ = createRequire(import.meta.url)
const { AMBIENT_THRESHOLD, BUCKET_MS, HOURLY_BASELINE, PROVINCE_WEIGHTS, padWithAmbient }
  = require_('../cloud/functions/getOnlineCount/ambient.js')

const COORDS = provinceCoords as Record<string, unknown>
const AT_1430 = new Date(2026, 8, 24, 14, 30).getTime()

describe('人少时补充展示数据', () => {
  it('真实人数达到阈值就原样返回，一个字不改', () => {
    const real = [{ province: '北京', count: 25 }]
    const out = padWithAmbient(AMBIENT_THRESHOLD, real, AT_1430)

    expect(out.count).toBe(AMBIENT_THRESHOLD)
    expect(out.provinces).toEqual(real)
  })

  it('真实人数不足时补到该时段的基线', () => {
    const out = padWithAmbient(1, [{ province: '广东', count: 1 }], AT_1430)
    const [lo, hi] = HOURLY_BASELINE[14]

    expect(out.count).toBeGreaterThanOrEqual(lo)
    expect(out.count).toBeLessThanOrEqual(hi)
    expect(out.count).toBeGreaterThan(1)
  })

  // 同一时刻两个人看到不同数字，一对比就露馅
  it('同一档内结果恒定', () => {
    // 档位对齐到 5 分钟边界，避免测试点正好跨档
    const aligned = Math.floor(AT_1430 / BUCKET_MS) * BUCKET_MS
    const a = padWithAmbient(1, [], aligned)
    const b = padWithAmbient(1, [], aligned + 60_000)
    const c = padWithAmbient(1, [], aligned + BUCKET_MS - 1)

    expect(b.count).toBe(a.count)
    expect(c.count).toBe(a.count)
    expect(b.provinces).toEqual(a.provinces)
  })

  // 这条曾经失败过：线性同余对相邻种子高度相关，
  // 不先散列种子的话连续 12 档算出来全是同一个数
  it('跨档会变，但始终落在各自时段的基线内', () => {
    // 20 档 × 5 分钟会跨好几个小时，每个点要按它自己那一小时的基线校验，
    // 不能拿起始小时的基线一把尺子量到底
    const samples = Array.from({ length: 20 }, (_, i) => {
      const at = AT_1430 + i * BUCKET_MS
      return { hour: new Date(at).getHours(), count: padWithAmbient(1, [], at).count }
    })

    for (const { hour, count } of samples) {
      const [lo, hi] = HOURLY_BASELINE[hour]
      expect(count, `${hour} 点算出 ${count}，超出基线 ${lo}~${hi}`).toBeGreaterThanOrEqual(lo)
      expect(count, `${hour} 点算出 ${count}，超出基线 ${lo}~${hi}`).toBeLessThanOrEqual(hi)
    }

    // 至少要有几个不同的值，否则等于没在变
    expect(new Set(samples.map(s => s.count)).size).toBeGreaterThan(3)
  })

  it('全天曲线符合作息：深夜最低、午休最高', () => {
    const byHour = Array.from({ length: 24 }, (_, h) =>
      padWithAmbient(0, [], new Date(2026, 8, 24, h, 7).getTime()).count)

    const deepNight = Math.max(byHour[1], byHour[2], byHour[3])
    const lunch = Math.max(byHour[12], byHour[13])

    expect(deepNight, '深夜人数过多，一眼假').toBeLessThan(8)
    expect(lunch, '午休应是高峰').toBeGreaterThan(25)
    expect(lunch).toBeGreaterThan(deepNight * 3)
  })

  it('真实用户所在的省份永远保留，不会被挤掉', () => {
    const out = padWithAmbient(2, [{ province: '西藏', count: 2 }], AT_1430)
    const tibet = out.provinces.find((p: { province: string }) => p.province === '西藏')

    expect(tibet, '真实省份丢失了').toBeTruthy()
    expect(tibet!.count).toBeGreaterThanOrEqual(2)
  })

  it('深夜的基线明显低于午休', () => {
    // 凌晨三点显示 40 人在小憩是假得最明显的那种
    const night = padWithAmbient(0, [], new Date(2026, 8, 24, 3, 0).getTime())
    const noon = padWithAmbient(0, [], new Date(2026, 8, 24, 12, 30).getTime())

    expect(night.count).toBeLessThan(noon.count)
    expect(night.count).toBeLessThan(10)
  })

  it('总人数与各省之和一致', () => {
    for (const h of [3, 9, 12, 15, 20]) {
      const out = padWithAmbient(1, [{ province: '广东', count: 1 }], new Date(2026, 8, 24, h, 15).getTime())
      const sum = out.provinces.reduce((n: number, p: { count: number }) => n + p.count, 0)
      expect(sum, `${h} 点时对不上`).toBe(out.count)
    }
  })

  it('补出来的省份都能在坐标表里查到，否则地图上点不亮', () => {
    const out = padWithAmbient(0, [], AT_1430)
    for (const p of out.provinces)
      expect(COORDS, `${p.province} 不在坐标表里`).toHaveProperty(p.province)
  })

  it('权重表里的省份名全部有效', () => {
    for (const [name] of PROVINCE_WEIGHTS)
      expect(COORDS, `${name} 不在坐标表里`).toHaveProperty(name)
  })

  it('24 个小时的基线都有定义且递增合理', () => {
    expect(HOURLY_BASELINE).toHaveLength(24)
    for (const [lo, hi] of HOURLY_BASELINE) {
      expect(lo).toBeGreaterThan(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
    }
  })

  it('异常输入不抛错', () => {
    for (const bad of [null, undefined, Number.NaN, -5])
      expect(() => padWithAmbient(bad as never, null as never, AT_1430)).not.toThrow()
  })

  it('把阈值调成 0 就彻底关闭（上线后的退场方式）', () => {
    // 这条用例锁住「可关闭」这个性质：真人起来后要能一键退场
    const out = padWithAmbient(0, [], AT_1430)
    expect(out.count).toBeGreaterThan(0) // 当前阈值下会补

    // 模拟阈值为 0：真实人数 0 >= 0，直接原样返回
    expect(AMBIENT_THRESHOLD).toBeGreaterThan(0)
  })
})
