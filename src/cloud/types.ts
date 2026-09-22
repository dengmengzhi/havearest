import type { CardCategory, CardType, Greeting, NapCard, TimerEndReason, TimeSlot } from '@/types'

/**
 * 云函数出入参契约。
 *
 * 本轮定死这些类型即是前后端约定 —— 下一轮实现业务逻辑时只换实现、不改签名，
 * 云函数侧（cloud/functions/*）按同一份字段写。
 */

export interface GetCardsRequest {
  /** 最近看过的卡片 id，最多 200 个（PRD F3） */
  excludeIds: string[]
  /** 单次取几张，PRD 默认 20 */
  limit: number
}

export interface GetCardsResponse {
  cards: NapCard[]
  /** 池子已耗尽、服务端已重置时为 true，客户端同步清空本地已看列表 */
  exhausted: boolean
}

export interface GetGreetingsRequest {
  slot: string
  excludeIds: string[]
}

export interface GetGreetingsResponse {
  greetings: Greeting[]
}

export interface HeartbeatRequest {
  /** 客户端时间戳，仅用于排障，在线判定以服务端时间为准 */
  clientNow: number
}

export interface HeartbeatResponse {
  ok: boolean
}

export interface GetOnlineCountResponse {
  /** 30 秒内有心跳的用户数（PRD F4） */
  count: number
}

export interface TrackRequest {
  /** 批量上报，客户端攒批后发送 */
  events: Array<Record<string, unknown>>
}

export interface TrackResponse {
  accepted: number
}

// ─────────────────────────────────────────────────────────
// 云数据库集合的文档形态。
//
// 云开发数据库是 schemaless 的，字段不需要预先定义 —— 但前后端必须约定一致，
// 这里就是那份约定。集合与索引由 scripts/init-db.mjs 创建。
//
// 命名：统一 camelCase。唯一例外是 `_openid` 与 `_id`，那是云开发的系统字段。
// （PRD 数据章节写的是 snake_case，那是描述性的；代码里统一 camelCase 可以省掉
//   前后端之间的字段转换，减少一类低级 bug。）
// ─────────────────────────────────────────────────────────

/** users 集合。`_openid` 由云开发自动写入，天然唯一，不需要额外建唯一索引。 */
export interface UserDoc {
  _openid: string
  /** 毫秒时间戳 */
  firstOpenAt: number
  lastOpenAt: number
  /** 首次来源：`${scene}:${渠道码}`，如 `1001:grp1` */
  source: string
  /** 有效小憩次数（真正开始过计时的） */
  totalSessions: number
  totalSeconds: number
}

/**
 * events 集合。埋点事件流。
 *
 * 事件字段**展平**存放而不是塞进嵌套的 payload —— PRD 要求直接在云开发控制台
 * 用聚合查询看数，展平后写聚合管道方便得多。字段因事件而异，故全部可选。
 */
export interface EventDoc {
  _openid: string
  /** 事件名，取值见 constants/events.ts 的 AnalyticsEvent */
  event: string
  /** 服务端时间戳，不信客户端时钟 */
  createdAt: number

  scene?: number
  hour?: number
  isNew?: boolean
  greetingId?: string
  slot?: TimeSlot
  count?: number
  shown?: boolean
  duration?: number
  actualSeconds?: number
  reason?: TimerEndReason
  choice?: 'back' | 'again'
  againCount?: number
  cardId?: string
  category?: CardCategory
  index?: number
  dwellMs?: number
  fromTimerSeconds?: number
  length?: number
}

/** cards 集合。`_id` 直接用业务 id（如 `c-001`），getCards 的 excludeIds 就按它查。 */
export interface CardDoc {
  _id: string
  type: CardType
  category: CardCategory
  /** 文字卡 ≤ 80 字；图文卡 ≤ 40 字 */
  text: string
  /** 仅图文卡。云存储 CDN 地址，图 ≤ 200 KB，竖版 3:4 */
  imageUrl?: string
  /** 下架开关：内容出问题时不用删文档，置 false 即可 */
  enabled: boolean
  createdAt: number
}

/** greetings 集合。`_id` 用业务 id（如 `g-af-001`）。 */
export interface GreetingDoc {
  _id: string
  slot: TimeSlot
  /** ≤ 30 字 */
  text: string
  enabled: boolean
  createdAt: number
}

/**
 * heartbeat 集合。在线心跳。
 *
 * ⚠️ `lastSeen` 必须是 **Date 对象**，不能是数字时间戳 —— MongoDB 的 TTL 索引
 * 只对 BSON Date 类型生效。存成 number 的话 TTL 静默失效，文档永不过期，
 * 在线人数会随时间单调虚高（PRD F4 直接失真）。
 *
 * `_id` 用 openid，靠 upsert 保证一个用户只有一条。
 */
export interface HeartbeatDoc {
  _id: string
  _openid: string
  lastSeen: Date
}

/** feedback 集合。 */
export interface FeedbackDoc {
  _openid: string
  content: string
  /** 冗余存长度，便于不读正文就做聚合（PRD 埋点 feedback_submit 只要长度） */
  length: number
  createdAt: number
}

/** 供内容导入脚本用：把本地 JSON 的形态转成入库形态。 */
export type CardSeed = Omit<CardDoc, '_id' | 'enabled' | 'createdAt'> & { id: NapCard['id'] }
export type GreetingSeed = Omit<GreetingDoc, '_id' | 'enabled' | 'createdAt'> & { id: Greeting['id'] }
