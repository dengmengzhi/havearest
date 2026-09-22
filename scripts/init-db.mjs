#!/usr/bin/env node
/**
 * 云数据库初始化：建集合 + 建索引。
 *
 * 云开发数据库是 schemaless 的 —— 字段不需要预先定义，第一次写入时自动产生。
 * 所以这里只做三件事里的两件：建集合、建索引。
 * 第三件（权限）必须去云开发控制台设，没有 CLI 入口，见文末提示。
 *
 * 可重复执行：集合/索引已存在时跳过，不会报错退出。
 *
 * 用法：
 *   node scripts/init-db.mjs          # 执行
 *   node scripts/init-db.mjs --dry    # 只打印将要执行的命令
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

const DRY = process.argv.includes('--dry')
const envId = JSON.parse(readFileSync('cloudbaserc.json', 'utf8')).envId

if (!envId) {
  console.error('✗ cloudbaserc.json 里的 envId 是空的')
  process.exit(1)
}

/**
 * 集合与索引定义。
 * 字段名统一 camelCase —— 唯一例外是 `_openid`，那是云开发自动写入的系统字段，改不了名。
 */
const COLLECTIONS = [
  {
    name: 'users',
    desc: '用户。_openid 天然唯一，额外按首次打开时间建索引供留存分组',
    indexes: [
      { key: { firstOpenAt: 1 }, name: 'idx_firstOpenAt' },
    ],
  },
  {
    name: 'events',
    desc: '埋点事件流。两条索引分别服务「按事件聚合」与「按用户算留存」',
    indexes: [
      { key: { event: 1, createdAt: -1 }, name: 'idx_event_createdAt' },
      { key: { _openid: 1, createdAt: 1 }, name: 'idx_openid_createdAt' },
    ],
  },
  {
    name: 'cards',
    desc: '小憩卡内容库',
    indexes: [
      { key: { category: 1 }, name: 'idx_category' },
      { key: { enabled: 1 }, name: 'idx_enabled' },
    ],
  },
  {
    name: 'greetings',
    desc: '问候文案库。getGreetings 按 slot 查',
    indexes: [
      { key: { slot: 1 }, name: 'idx_slot' },
    ],
  },
  {
    name: 'heartbeat',
    desc: '在线心跳。TTL 索引 60 秒自动清理，否则在线数会随时间虚高',
    indexes: [
      // expireAfterSeconds: 文档在 lastSeen 之后 60 秒被自动删除。
      // 在线判定窗口是 30 秒（PRD F4），留一倍余量避免边界抖动。
      { key: { lastSeen: 1 }, name: 'ttl_lastSeen', expireAfterSeconds: 60 },
    ],
  },
  {
    name: 'feedback',
    desc: '用户反馈',
    indexes: [
      { key: { createdAt: -1 }, name: 'idx_createdAt' },
    ],
  },
]

function run(tableName, command) {
  const payload = JSON.stringify([{ TableName: tableName, CommandType: 'COMMAND', Command: JSON.stringify(command) }])
  if (DRY) {
    console.log(`  [dry] ${JSON.stringify(command)}`)
    return { ok: true }
  }
  try {
    const out = execFileSync('npx', ['tcb', 'db', 'nosql', 'execute', '--command', payload, '-e', envId], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, out }
  }
  catch (e) {
    const msg = `${e.stdout ?? ''}${e.stderr ?? ''}`
    return { ok: false, msg }
  }
}

/** 已存在不算失败 —— 让脚本可以重复跑。 */
function isAlreadyExists(msg) {
  return /already exists|NamespaceExists|IndexOptionsConflict|已存在/i.test(msg)
}

console.log(`环境: ${envId}${DRY ? '  (dry run)' : ''}\n`)

let failed = 0
for (const coll of COLLECTIONS) {
  console.log(`━━ ${coll.name} — ${coll.desc}`)

  const created = run(coll.name, { create: coll.name })
  if (created.ok) {
    console.log('   ✓ 集合已建立')
  }
  else if (isAlreadyExists(created.msg)) {
    console.log('   · 集合已存在，跳过')
  }
  else {
    console.log(`   ✗ 建集合失败: ${created.msg.trim().split('\n').pop()}`)
    failed++
    continue
  }

  for (const idx of coll.indexes) {
    const r = run(coll.name, { createIndexes: coll.name, indexes: [idx] })
    const ttl = idx.expireAfterSeconds ? `  (TTL ${idx.expireAfterSeconds}s)` : ''
    if (r.ok) {
      console.log(`   ✓ 索引 ${idx.name}${ttl}`)
    }
    else if (isAlreadyExists(r.msg)) {
      console.log(`   · 索引 ${idx.name} 已存在，跳过`)
    }
    else {
      console.log(`   ✗ 索引 ${idx.name} 失败: ${r.msg.trim().split('\n').pop()}`)
      failed++
    }
  }
  console.log()
}

console.log(failed === 0 ? '✓ 初始化完成' : `✗ ${failed} 项失败`)
console.log(`
下一步（CLI 做不了，要去云开发控制台）：
  设置每个集合的权限。默认权限通常过宽，按下面收紧：
    users / events / heartbeat / feedback  → 仅创建者可读写（或全部禁止，只让云函数访问）
    cards / greetings                      → 所有人可读，仅管理端可写
  云函数用的是管理员权限，不受集合权限限制，所以全部设成「仅管理端」最安全。`)

process.exit(failed === 0 ? 0 : 1)
