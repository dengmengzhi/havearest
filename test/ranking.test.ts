import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require_ = createRequire(import.meta.url)
const { assignRanks, buildRanking, compare, TOP_LIMIT, toEntry }
  = require_('../cloud/functions/getRanking/rank.js')
const { normalizeSeconds, MAX_SESSION_SECONDS }
  = require_('../cloud/functions/finishSession/session.js')

interface Entry {
  rank?: number
  province: string
  seconds: number
  sessions: number
  mine: boolean
}

function entry(province: string, seconds: number, sessions = 1, mine = false): Entry {
  return { province, seconds, sessions, mine }
}

describe('文档转条目（脱敏在这里发生）', () => {
  // 榜单一旦带上 openid，就成了一份「谁在什么省、歇了多久」的名单
  it('绝不下发 _id / openid', () => {
    const out = toEntry({ _id: 'o-abc', province: '广东', totalSeconds: 600, totalSessions: 2 }, 'o-abc')
    expect(Object.keys(out).sort()).toEqual(['mine', 'province', 'seconds', 'sessions'])
    expect(JSON.stringify(out)).not.toContain('o-abc')
  })

  it('_id 等于我的 openid 时标记 mine', () => {
    expect(toEntry({ _id: 'me', province: '广东', totalSeconds: 600 }, 'me').mine).toBe(true)
    expect(toEntry({ _id: 'other', province: '广东', totalSeconds: 600 }, 'me').mine).toBe(false)
  })

  it('没有 openid 时谁都不是我', () => {
    expect(toEntry({ _id: undefined, province: '广东', totalSeconds: 600 }, '').mine).toBe(false)
  })

  it('没歇过的人不上榜', () => {
    expect(toEntry({ _id: 'a', totalSeconds: 0 }, 'a')).toBeNull()
    expect(toEntry({ _id: 'a', totalSeconds: -5 }, 'a')).toBeNull()
    expect(toEntry({ _id: 'a' }, 'a')).toBeNull()
    expect(toEntry(null, 'a')).toBeNull()
  })

  it('省份缺失时留空串，交给页面显示「某处」', () => {
    expect(toEntry({ _id: 'a', totalSeconds: 600 }, 'a').province).toBe('')
  })

  it('次数异常时按 0 计，不让页面渲染出 NaN 次', () => {
    expect(toEntry({ _id: 'a', totalSeconds: 600, totalSessions: 'x' }, 'a').sessions).toBe(0)
  })
})

describe('名次', () => {
  it('同时长并列同名次，下一名跳号', () => {
    const out = assignRanks([entry('粤', 900), entry('浙', 600), entry('京', 600), entry('苏', 300)])
    expect(out.map((e: Entry) => e.rank)).toEqual([1, 2, 2, 4])
  })

  it('三个并列也只跳一次号', () => {
    const out = assignRanks([entry('浙', 600), entry('京', 600), entry('粤', 600), entry('苏', 300)])
    expect(out.map((e: Entry) => e.rank)).toEqual([1, 1, 1, 4])
  })

  it('时长相同时次数多的在前 —— 同样的时间歇得更勤', () => {
    const out = [entry('京', 600, 2), entry('浙', 600, 5)].sort(compare)
    expect(out.map((e: Entry) => e.province)).toEqual(['浙', '京'])
  })

  // 顺序不定的话，两次刷新之间同分的行会互换，榜单看上去在抖
  it('时长次数都相同时按省名定序，结果可重复', () => {
    const a = [entry('浙', 600, 2), entry('京', 600, 2)].sort(compare)
    const b = [entry('京', 600, 2), entry('浙', 600, 2)].sort(compare)
    expect(a.map((e: Entry) => e.province)).toEqual(b.map((e: Entry) => e.province))
    expect(a.map((e: Entry) => e.province)).toEqual(['京', '浙'])
  })
})

describe('组装榜单', () => {
  const many = Array.from({ length: 30 }, (_, i) => entry(`省${i}`, 3000 - i * 10, 3))

  it('按时长降序，不依赖入参顺序', () => {
    const out = buildRanking([entry('京', 300), entry('粤', 900), entry('浙', 600)], null, 0)
    expect(out.entries.map((e: Entry) => e.province)).toEqual(['粤', '浙', '京'])
  })

  it(`最多只出 ${TOP_LIMIT} 条`, () => {
    expect(buildRanking(many, null, 0).entries).toHaveLength(TOP_LIMIT)
  })

  it('入参数组不被就地排序', () => {
    const input = [entry('京', 300), entry('粤', 900)]
    buildRanking(input, null, 0)
    expect(input[0].province).toBe('京')
  })

  it('我进榜时 mine 指向榜内那一条，不另给一份', () => {
    const out = buildRanking([entry('粤', 900), entry('浙', 600, 1, true)], null, 99)
    expect(out.mine).toEqual(out.entries[1])
    expect(out.mine.rank).toBe(2)
  })

  it('我没进榜时按「比我多的人数 + 1」给出真实名次', () => {
    const out = buildRanking(many, entry('湘', 120, 1, true), 137)
    expect(out.entries.some((e: Entry) => e.mine)).toBe(false)
    expect(out.mine).toEqual({ rank: 138, province: '湘', seconds: 120, sessions: 1, mine: true })
  })

  it('还没歇过（myEntry 为空）时不给 mine，也不编一个名次', () => {
    expect(buildRanking(many, null, 0).mine).toBeNull()
  })

  // countAbove 查失败时 index.js 会把 myEntry 置空，就是为了走到这条分支：
  // 兜底成「第 1 名」是在编造
  it('名次算不出来时宁可不显示我那一行', () => {
    expect(buildRanking(many, null, Number.NaN).mine).toBeNull()
  })

  it('空榜单与非数组都不炸', () => {
    expect(buildRanking([], null, 0)).toEqual({ entries: [], mine: null })
    expect(buildRanking(undefined, null, 0)).toEqual({ entries: [], mine: null })
  })
})

describe('上报时长的清洗', () => {
  it('正常值向下取整', () => {
    expect(normalizeSeconds(300)).toBe(300)
    expect(normalizeSeconds(299.9)).toBe(299)
  })

  it('0、负数、非数字都不计入', () => {
    expect(normalizeSeconds(0)).toBe(0)
    expect(normalizeSeconds(-60)).toBe(0)
    expect(normalizeSeconds('abc')).toBe(0)
    expect(normalizeSeconds(undefined)).toBe(0)
    expect(normalizeSeconds(Number.NaN)).toBe(0)
    expect(normalizeSeconds(Number.POSITIVE_INFINITY)).toBe(0)
  })

  // 榜单一旦能被刷，它就没有任何意义了
  it('超过上限的一律截到上限，挡住刷时长', () => {
    expect(normalizeSeconds(MAX_SESSION_SECONDS + 1)).toBe(MAX_SESSION_SECONDS)
    expect(normalizeSeconds(999999999)).toBe(MAX_SESSION_SECONDS)
  })

  it('上限就是客户端不可能超过的 30 分钟', () => {
    expect(MAX_SESSION_SECONDS).toBe(30 * 60)
  })
})
