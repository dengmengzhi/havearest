import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CARD, INK, MOSS } from '@/constants/colors'

describe('jS 颜色常量与 tokens.scss 的一致性', () => {
  // 地图 marker 的 callout 是 JS 对象配的，拿不到 scss 变量，
  // 所以颜色在两处各存一份 —— 必须不漂移，否则地图气泡的配色会和全站脱节
  const tokens = readFileSync('src/styles/tokens.scss', 'utf8')

  function tokenValue(name: string): string {
    // 逐行找 `$name: #xxxxxx`，比拼正则更不容易被转义坑到
    const line = tokens.split('\n').find(l => l.trimStart().startsWith(`$${name}:`))
    expect(line, `tokens.scss 里找不到 $${name}`).toBeTruthy()

    const hex = line!.match(/#[0-9a-f]{3,8}/i)
    expect(hex, `$${name} 的值不是十六进制`).not.toBeNull()
    return hex![0].toLowerCase()
  }

  it('iNK 与 $ink 一致', () => {
    expect(INK.toLowerCase()).toBe(tokenValue('ink'))
  })

  it('cARD 与 $card 一致', () => {
    expect(CARD.toLowerCase()).toBe(tokenValue('card'))
  })

  it('mOSS 与 $moss 一致', () => {
    expect(MOSS.toLowerCase()).toBe(tokenValue('moss'))
  })

  it('都是合法的十六进制色值', () => {
    for (const c of [INK, CARD, MOSS])
      expect(c).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
