#!/usr/bin/env node
/**
 * 生成点阵地图数据。
 *
 * 为什么不用 SVG：微信小程序的 image 组件渲染不了这张地图 —— 先后试过
 * 文件路径 + scaleToFill、文件路径 + aspectFit、base64 data URI +
 * preserveAspectRatio="none"，小程序端一律白屏（同样是本地 svg 的鱼头像却正常，
 * 差别应该在 path 复杂度与 stroke 属性上）。
 *
 * 改成把中国轮廓离散成网格，用 <view> 一格一格画出来：纯节点、不经过图片解码，
 * 零兼容风险。点阵风格也更贴「简版地图」的定位。
 *
 * 改动边界或网格密度后重跑：pnpm gen:map
 */
import { writeFileSync } from 'node:fs'
import process from 'node:process'

// 经纬度范围与投影，与省份坐标表用同一套映射
const LON0 = 73.0
const LON1 = 135.0
const LAT0 = 18.0
const LAT1 = 54.0

/**
 * 网格密度。
 * 列数越多越像地图，但 <view> 节点数也线性上涨 —— 小程序里节点太多会拖慢渲染。
 * 28 列时境内格子约 300 个，是可读性与性能的平衡点。
 */
const COLS = 28
const ROWS = Math.round(COLS * ((LAT1 - LAT0) / (LON1 - LON0)) / 0.82)

/** 极简中国边界（顺时针）。不求地理精确，只求一眼认得出。 */
const MAINLAND = [
  [134.3, 48.4],
  [131.3, 45.0],
  [130.6, 42.9],
  [128.0, 41.6],
  [125.7, 40.9],
  [124.4, 40.0],
  [122.1, 39.6],
  [121.6, 38.9],
  [119.6, 39.9],
  [117.7, 38.9],
  [119.2, 37.0],
  [122.7, 37.4],
  [120.2, 35.9],
  [119.2, 34.3],
  [121.9, 30.9],
  [121.6, 29.9],
  [120.2, 27.4],
  [119.6, 25.4],
  [118.1, 24.5],
  [116.7, 23.4],
  [113.5, 22.2],
  [111.0, 21.5],
  [109.5, 21.4],
  [108.2, 21.5],
  [106.7, 22.0],
  [104.8, 22.8],
  [103.3, 22.5],
  [101.6, 21.2],
  [99.2, 22.1],
  [97.5, 24.0],
  [98.7, 25.9],
  [97.5, 28.3],
  [96.2, 29.0],
  [94.6, 29.3],
  [92.1, 27.8],
  [88.9, 27.3],
  [85.8, 28.2],
  [81.3, 30.4],
  [78.7, 31.3],
  [78.9, 33.5],
  [76.0, 35.5],
  [74.9, 37.0],
  [73.6, 39.5],
  [75.2, 40.4],
  [76.9, 41.0],
  [80.2, 42.2],
  [82.6, 45.1],
  [85.0, 47.0],
  [87.9, 48.6],
  [90.5, 47.8],
  [93.5, 49.0],
  [97.2, 50.9],
  [102.1, 51.4],
  [106.9, 50.3],
  [110.2, 49.2],
  [115.5, 47.9],
  [117.8, 49.5],
  [119.7, 50.3],
  [120.7, 53.5],
  [124.5, 53.2],
  [127.5, 50.2],
  [130.7, 48.9],
]
const TAIWAN = [[121.0, 25.3], [121.9, 24.9], [121.6, 23.1], [120.9, 21.9], [120.1, 23.0], [120.5, 24.7]]
const HAINAN = [[110.0, 20.1], [110.6, 19.9], [110.5, 18.5], [109.2, 18.3], [108.6, 19.3], [109.1, 19.9]]

/** 射线法判断点是否在多边形内。 */
function inside(lon, lat, poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      hit = !hit
  }
  return hit
}

const cells = []
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    // 取格子中心判断，避免边界格子忽有忽无
    const lon = LON0 + ((c + 0.5) / COLS) * (LON1 - LON0)
    const lat = LAT1 - ((r + 0.5) / ROWS) * (LAT1 - LAT0)
    if (inside(lon, lat, MAINLAND) || inside(lon, lat, TAIWAN) || inside(lon, lat, HAINAN))
      cells.push([c, r])
  }
}

writeFileSync('src/assets/map/grid.ts', `// 本文件由 scripts/gen-map-asset.mjs 生成，请勿手改。改完重跑 \`pnpm gen:map\`。
//
// 中国轮廓离散成的网格。用 <view> 一格一格画，而不是 <image> 加载 SVG ——
// 小程序渲染不了那张 SVG（文件路径、base64、两种 mode 都试过，一律白屏）。
export const MAP_COLS = ${COLS}
export const MAP_ROWS = ${ROWS}

/** 落在中国境内的格子，[列, 行]，原点在左上角。 */
export const MAP_CELLS: ReadonlyArray<readonly [number, number]> = ${JSON.stringify(cells)}
`)

console.log(`✓ src/assets/map/grid.ts`)
console.log(`  网格 ${COLS} × ${ROWS}，境内 ${cells.length} 格（即 ${cells.length} 个 view 节点）`)
if (cells.length > 600) {
  console.error('✗ 格子数过多，小程序渲染会卡，调小 COLS')
  process.exit(1)
}
