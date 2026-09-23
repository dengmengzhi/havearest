import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require_ = createRequire(import.meta.url)
const { toProvinceList } = require_('../cloud/functions/getOnlineCount/aggregate.js')

describe('聚合结果转客户端契约', () => {
  it('把 _id 改名成 province', () => {
    expect(toProvinceList([{ _id: '广东', count: 11 }]))
      .toEqual([{ province: '广东', count: 11 }])
  })

  it('按人数降序，便于日志排查', () => {
    const out = toProvinceList([
      { _id: '浙江', count: 5 },
      { _id: '广东', count: 11 },
      { _id: '北京', count: 9 },
    ])
    expect(out.map((p: { province: string }) => p.province)).toEqual(['广东', '北京', '浙江'])
  })

  it('丢掉 _id 为空的分组', () => {
    // province 缺失的文档本该被 match 过滤掉，万一漏进来，
    // 空名字在前端查不到坐标，留着只是噪音
    expect(toProvinceList([{ _id: '', count: 3 }, { _id: '北京', count: 2 }]))
      .toEqual([{ province: '北京', count: 2 }])
  })

  it('丢掉人数为 0 或负数的分组', () => {
    expect(toProvinceList([{ _id: '广东', count: 0 }, { _id: '北京', count: -1 }])).toEqual([])
  })

  it('跳过 null / 非对象行，不抛错', () => {
    expect(() => toProvinceList([null, undefined, 'x', { _id: '北京', count: 2 }])).not.toThrow()
    expect(toProvinceList([null, undefined, 'x', { _id: '北京', count: 2 }]))
      .toEqual([{ province: '北京', count: 2 }])
  })

  it('count 是字符串时也能转成数字', () => {
    // 聚合返回的类型不一定是 number，前端 count >= 10 的分档依赖它是数字
    const out = toProvinceList([{ _id: '广东', count: '11' }])
    expect(out[0].count).toBe(11)
    expect(typeof out[0].count).toBe('number')
  })

  it('非数组输入返回空数组而不是抛错', () => {
    for (const bad of [null, undefined, {}, 'list', 42])
      expect(toProvinceList(bad)).toEqual([])
  })

  it('空数组返回空数组', () => {
    expect(toProvinceList([])).toEqual([])
  })

  it('输出形状与 ProvincePresence 契约一致', () => {
    const out = toProvinceList([{ _id: '广东', count: 11 }])
    expect(Object.keys(out[0]).sort()).toEqual(['count', 'province'])
  })
})
