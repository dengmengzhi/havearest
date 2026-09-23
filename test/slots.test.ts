import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require_ = createRequire(import.meta.url)
const { SLOTS, pickCandidates } = require_('../cloud/functions/getGreetings/slots.js')

function doc(id: string, text = `文案 ${id}`) {
  return { _id: id, slot: 'afternoon', text }
}

describe('时段白名单', () => {
  it('覆盖 7 个时段，与 TimeSlot 一致', () => {
    expect(SLOTS.size).toBe(7)
    for (const s of ['earlyMorning', 'morning', 'noon', 'afternoon', 'evening', 'night', 'weekend'])
      expect(SLOTS.has(s)).toBe(true)
  })

  it('不认识的时段会被拦住', () => {
    for (const bad of ['', 'Afternoon', 'midnight', 'undefined'])
      expect(SLOTS.has(bad)).toBe(false)
  })
})

describe('候选集整理', () => {
  it('没看过的排前面，看过的垫底', () => {
    const out = pickCandidates([doc('a'), doc('b'), doc('c')], ['a'])
    expect(out.map((g: { id: string }) => g.id)).toEqual(['b', 'c', 'a'])
  })

  // 这是修过的历史 bug：服务端一旦过滤掉已看过的，当天看完后就返回空数组，
  // 客户端「耗尽就重来」是在那个空数组上重试的，顶部会一直空着
  it('全部看过时仍返回全量，绝不返回空数组', () => {
    const out = pickCandidates([doc('a'), doc('b')], ['a', 'b'])
    expect(out).toHaveLength(2)
    expect(out.map((g: { id: string }) => g.id).sort()).toEqual(['a', 'b'])
  })

  it('没有 excludeIds 时原样返回', () => {
    expect(pickCandidates([doc('a'), doc('b')], [])).toHaveLength(2)
  })

  it('把 _id 改名成 id，与客户端 Greeting 契约一致', () => {
    const out = pickCandidates([doc('a')], [])
    expect(Object.keys(out[0]).sort()).toEqual(['id', 'slot', 'text'])
  })

  it('文案两侧空白会被去掉', () => {
    expect(pickCandidates([doc('a', '  有空白  ')], [])[0].text).toBe('有空白')
  })

  it('丢掉没有 id 或文案为空的脏文档', () => {
    const dirty = [doc('a'), { _id: '', slot: 'afternoon', text: 'x' }, { _id: 'b', slot: 'afternoon', text: '   ' }, { _id: 'c' }]
    const out = pickCandidates(dirty, [])
    expect(out.map((g: { id: string }) => g.id)).toEqual(['a'])
  })

  it('跳过 null 行不抛错', () => {
    expect(() => pickCandidates([null, undefined, doc('a')], [])).not.toThrow()
    expect(pickCandidates([null, undefined, doc('a')], [])).toHaveLength(1)
  })

  it('非数组输入返回空数组', () => {
    for (const bad of [null, undefined, {}, 'x', 42])
      expect(pickCandidates(bad, [])).toEqual([])
  })

  it('excludeIds 非数组时当作空处理', () => {
    expect(pickCandidates([doc('a')], null)).toHaveLength(1)
    expect(pickCandidates([doc('a')], undefined)).toHaveLength(1)
  })
})
