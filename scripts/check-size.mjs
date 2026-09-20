#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'
/**
 * 主包体积检查。
 *
 * PRD 非功能·性能：主包 ≤ 1.5 MB。该指标原本是按原生小程序定的，
 * 换成 uni-app 后会多带 Vue 3 + uni runtime，所以需要持续盯着。
 *
 * 微信按**压缩后**的代码包大小计算，因此这里统计逐文件 gzip 之和，
 * 与开发者工具显示的口径接近。
 */
import { gzipSync } from 'node:zlib'

const DIST = process.argv[2] ?? 'dist/build/mp-weixin'
const LIMIT_KB = 1536 // PRD 硬限制 1.5 MB
const WARN_KB = 1024 // 到达 2/3 就该提前处理，别等撞线

let total = 0
let raw = 0
const files = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full)
      continue
    }
    const buf = readFileSync(full)
    const gz = gzipSync(buf).length
    raw += buf.length
    total += gz
    files.push({ path: relative(DIST, full), gz })
  }
}

try {
  walk(DIST)
}
catch {
  console.error(`✗ 找不到产物目录 ${DIST}，先跑 pnpm build:mp-weixin`)
  process.exit(1)
}

const totalKb = total / 1024
files.sort((a, b) => b.gz - a.gz)

console.log(`产物目录  ${DIST}`)
console.log(`文件数    ${files.length}`)
console.log(`未压缩    ${(raw / 1024).toFixed(1)} KB`)
console.log(`压缩后    ${totalKb.toFixed(1)} KB  (限制 ${LIMIT_KB} KB，预警 ${WARN_KB} KB)`)
console.log('\n最大的 5 个文件：')
for (const f of files.slice(0, 5))
  console.log(`  ${(f.gz / 1024).toFixed(1).padStart(7)} KB  ${f.path}`)

if (totalKb > LIMIT_KB) {
  console.error(`\n✗ 超出主包限制 ${LIMIT_KB} KB`)
  process.exit(1)
}
if (totalKb > WARN_KB) {
  console.warn(`\n⚠ 已超过预警线 ${WARN_KB} KB，该考虑分包或裁剪了`)
  process.exit(0)
}
console.log(`\n✓ 主包体积检查通过，余量 ${(LIMIT_KB - totalKb).toFixed(0)} KB`)
