import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require_ = createRequire(import.meta.url)
const { AMBIENT_MIN_ROWS, BUCKET_MS, padRanking, PROVINCE_WEIGHTS }
  = require_('../cloud/functions/getRanking/ambient.js')
const { KNOWN_PROVINCES } = require_('../cloud/functions/heartbeat/ipRegion.js')

interface Entry {
  province: string
  seconds: number
  sessions: number
  mine: boolean
}

const DAY1 = new Date(2026, 8, 24, 14, 30).getTime()
const DAY2 = DAY1 + BUCKET_MS

function real(province: string, seconds: number, mine = false): Entry {
  return { province, seconds, sessions: Math.max(1, Math.round(seconds / 300)), mine }
}

describe('榜单补数', () => {
  it('真实条目够多就原样返回，一条不动', () => {
    const rows = Array.from({ length: AMBIENT_MIN_ROWS }, (_, i) => real(`省${i}`, 600 + i))
    expect(padRanking(rows, DAY1)).toBe(rows)
  })

  it('人少时补到下限条数', () => {
    expect(padRanking([real('广东', 900)], DAY1)).toHaveLength(AMBIENT_MIN_ROWS)
    expect(padRanking([], DAY1)).toHaveLength(AMBIENT_MIN_ROWS)
  })

  it('真实条目原样保留在结果里', () => {
    const mineRow = real('湖北', 1500, true)
    const out = padRanking([real('广东', 900), mineRow], DAY1)
    expect(out).toContain(mineRow)
    expect(out.filter((e: Entry) => e.province === '广东' && e.seconds === 900)).toHaveLength(1)
  })

  // 「我」那一行永远来自真实数据，编出来的人不能顶着我的身份
  it('补出来的条目绝不标记为 mine', () => {
    const out = padRanking([real('广东', 900)], DAY1)
    expect(out.filter((e: Entry) => e.mine)).toHaveLength(0)
  })

  it('同一天里所有人看到同一份榜', () => {
    const a = padRanking([real('广东', 900)], DAY1)
    const b = padRanking([real('广东', 900)], DAY1 + 3 * 60 * 60 * 1000)
    expect(b).toEqual(a)
  })

  // 累计时长是只增不减的量，一天之内重排就露馅了；换一天才该换一批
  it('换一天会换一批数据', () => {
    const a = padRanking([real('广东', 900)], DAY1)
    const b = padRanking([real('广东', 900)], DAY2)
    expect(b.slice(1)).not.toEqual(a.slice(1))
  })

  it('补出来的省份都是真实存在的省级行政区', () => {
    const known = new Set(KNOWN_PROVINCES)
    for (let d = 0; d < 30; d++) {
      for (const e of padRanking([], DAY1 + d * BUCKET_MS) as Entry[])
        expect(known.has(e.province)).toBe(true)
    }
  })

  it('权重表里的省份也都是真实存在的', () => {
    const known = new Set(KNOWN_PROVINCES)
    for (const [name] of PROVINCE_WEIGHTS)
      expect(known.has(name)).toBe(true)
  })

  it('补出来的时长和次数都是正整数', () => {
    for (const e of padRanking([], DAY1) as Entry[]) {
      expect(Number.isInteger(e.seconds)).toBe(true)
      expect(e.seconds).toBeGreaterThan(0)
      expect(Number.isInteger(e.sessions)).toBe(true)
      expect(e.sessions).toBeGreaterThan(0)
    }
  })

  // 真实累计是若干个 3/5/10 分钟会话之和，冒出零碎秒数就不像真的
  it('补出来的时长对齐到整分钟', () => {
    for (const e of padRanking([], DAY1) as Entry[])
      expect(e.seconds % 60).toBe(0)
  })

  // 否则一个认真用了一整天的人会被一群编出来的数字永远压在最后
  it('真实最高值高时，补出来的不会把真人挤到垫底', () => {
    const top = real('广东', 40_000, true)
    const out = padRanking([top], DAY1) as Entry[]
    const above = out.filter(e => e !== top && e.seconds > top.seconds)
    expect(above.length).toBeLessThan(out.length - 1)
    expect(Math.max(...out.map(e => e.seconds))).toBeLessThanOrEqual(Math.round(40_000 * 1.3))
  })

  it('非数组入参不炸', () => {
    expect(padRanking(undefined, DAY1)).toHaveLength(AMBIENT_MIN_ROWS)
  })
})
