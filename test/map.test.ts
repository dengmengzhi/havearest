import { describe, expect, it } from 'vitest'
import { MAP_CELLS, MAP_COLS, MAP_ROWS } from '@/assets/map/grid'
import provinceCoords from '@/assets/map/provinces.json'

const COORDS = provinceCoords as Record<string, { x: number, y: number }>

describe('地图省份坐标', () => {
  it('所有坐标都落在 0~100% 之内，不会画到图外', () => {
    for (const [name, { x, y }] of Object.entries(COORDS)) {
      expect(x, `${name} 的 x`).toBeGreaterThanOrEqual(0)
      expect(x, `${name} 的 x`).toBeLessThanOrEqual(100)
      expect(y, `${name} 的 y`).toBeGreaterThanOrEqual(0)
      expect(y, `${name} 的 y`).toBeLessThanOrEqual(100)
    }
  })

  it('覆盖 34 个省级行政区', () => {
    expect(Object.keys(COORDS)).toHaveLength(34)
  })

  it('包含 PRD 目标用户集中的省份与直辖市', () => {
    for (const name of ['北京', '上海', '广东', '浙江', '江苏', '四川'])
      expect(COORDS, `缺少 ${name}`).toHaveProperty(name)
  })

  it('相对方位正确（用来验证投影没写反）', () => {
    // 纬度越高 y 越小：黑龙江在北京之北
    expect(COORDS['黑龙江'].y).toBeLessThan(COORDS['北京'].y)
    // 经度越大 x 越大：上海在四川之东
    expect(COORDS['上海'].x).toBeGreaterThan(COORDS['四川'].x)
    // 广东在北京之南
    expect(COORDS['广东'].y).toBeGreaterThan(COORDS['北京'].y)
    // 新疆是最西的
    const minX = Math.min(...Object.values(COORDS).map(c => c.x))
    expect(COORDS['新疆'].x).toBe(minX)
  })

  it('用短名而不是全称，与 IP 库的规整结果对齐', () => {
    // 前端按名字直接查表，带不带后缀必须统一，否则点不亮
    for (const name of Object.keys(COORDS)) {
      expect(name.endsWith('省'), `${name} 不该带「省」`).toBe(false)
      expect(name.endsWith('自治区'), `${name} 不该带「自治区」`).toBe(false)
      expect(name.endsWith('特别行政区'), `${name} 不该带「特别行政区」`).toBe(false)
    }
  })

  it('没有重复坐标（两个省叠在同一点说明数据写错了）', () => {
    const seen = new Set(Object.values(COORDS).map(c => `${c.x},${c.y}`))
    expect(seen.size).toBe(Object.keys(COORDS).length)
  })
})

describe('在线分布的 mock', () => {
  it('总人数等于各省人数之和', async () => {
    const { mockGetOnlineCount } = await import('@/cloud/mock')
    const res = mockGetOnlineCount()

    expect(res.count).toBe(res.provinces.reduce((n, p) => n + p.count, 0))
  })

  it('mock 里的省份都能在坐标表里查到', async () => {
    const { mockGetOnlineCount } = await import('@/cloud/mock')
    for (const p of mockGetOnlineCount().provinces)
      expect(COORDS, `${p.province} 不在坐标表里，地图上点不亮`).toHaveProperty(p.province)
  })

  it('三档光点都有数据覆盖，便于走查视觉', async () => {
    const { mockGetOnlineCount } = await import('@/cloud/mock')
    const counts = mockGetOnlineCount().provinces.map(p => p.count)

    expect(counts.some(n => n >= 10), '缺少 lg 档').toBe(true)
    expect(counts.some(n => n >= 3 && n < 10), '缺少 md 档').toBe(true)
    expect(counts.some(n => n < 3), '缺少 sm 档').toBe(true)
  })
})

describe('点阵底图', () => {
  // 不用 <image> 加载 SVG：小程序渲染不了那张图（文件路径、base64、两种 mode 都白屏），
  // 改成用 view 拼格子，零兼容风险
  it('格子数在可渲染的范围内', () => {
    // 每格一个 view 节点，太多会拖慢小程序渲染
    expect(MAP_CELLS.length).toBeGreaterThan(150)
    expect(MAP_CELLS.length).toBeLessThan(600)
  })

  it('所有格子都落在网格范围内', () => {
    for (const [c, r] of MAP_CELLS) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThan(MAP_COLS)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(MAP_ROWS)
    }
  })

  it('没有重复的格子', () => {
    const seen = new Set(MAP_CELLS.map(([c, r]) => `${c},${r}`))
    expect(seen.size).toBe(MAP_CELLS.length)
  })

  it('网格宽高比与组件的 padding-top 一致', () => {
    // 对不上的话格子不是方的，省份坐标也会整体偏移
    expect(Number((MAP_ROWS / MAP_COLS * 100).toFixed(2))).toBeCloseTo(71.43, 1)
  })

  it('每个省份的坐标都落在有格子的区域附近', () => {
    // 省份点画在轮廓外面就说明投影或边界数据错了
    const occupied = new Set(MAP_CELLS.map(([c, r]) => `${c},${r}`))
    const offGrid: string[] = []

    for (const [name, { x, y }] of Object.entries(COORDS)) {
      const c = Math.floor(x / 100 * MAP_COLS)
      const r = Math.floor(y / 100 * MAP_ROWS)
      // 允许落在相邻格：省会常在边界附近（如海口、台北）
      const near = [-1, 0, 1].some(dc => [-1, 0, 1].some(dr => occupied.has(`${c + dc},${r + dr}`)))
      if (!near)
        offGrid.push(name)
    }

    expect(offGrid, `这些省份画在了轮廓外：${offGrid.join('、')}`).toEqual([])
  })
})
