#!/usr/bin/env node
/**
 * 违禁字样扫描。
 *
 * R1（提审前清单）：全站搜索无「摸鱼」字样，对外文案统一用「小憩」。
 * R2（PRD F5 验收）：伪装层内不得出现「摸鱼」「小憩」及任何产品名。
 *
 * 这两条是提审硬门槛，靠人工搜容易漏，所以做成脚本挂在 CI 与提交前。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SCAN_DIRS = ['src', 'cloud', 'scripts']
const SCAN_EXT = new Set(['.ts', '.js', '.vue', '.json', '.scss', '.md'])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'unpackage', '.git'])

/** 全站禁用 */
const GLOBAL_FORBIDDEN = ['摸鱼', '摆烂', '辞职']
/** 仅伪装层禁用：它必须看起来与本产品无关 */
const DISGUISE_FORBIDDEN = ['小憩', '摸鱼', '专注模式', 'havearest', '搭子']
const DISGUISE_PATTERN = /disguise/i

const violations = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry))
      continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full)
      continue
    }
    if (!SCAN_EXT.has(extname(full)))
      continue
    check(full)
  }
}

function check(file) {
  const rel = relative(ROOT, file)
  const isDisguise = DISGUISE_PATTERN.test(rel)
  const words = isDisguise ? [...GLOBAL_FORBIDDEN, ...DISGUISE_FORBIDDEN] : GLOBAL_FORBIDDEN
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, i) => {
    for (const word of new Set(words)) {
      if (line.includes(word))
        violations.push({ file: rel, line: i + 1, word, text: line.trim().slice(0, 80) })
    }
  })
}

for (const dir of SCAN_DIRS) {
  try {
    walk(join(ROOT, dir))
  }
  catch {
    // 目录不存在就跳过
  }
}

if (violations.length > 0) {
  console.error(`✗ 发现 ${violations.length} 处违禁字样：\n`)
  for (const v of violations)
    console.error(`  ${v.file}:${v.line}  「${v.word}」  ${v.text}`)
  console.error('\n对外文案统一用「小憩」；伪装层内不得出现任何产品相关字样。')
  process.exit(1)
}

console.log('✓ 字样扫描通过（R1/R2）')
