import type { Greeting, TimerEndReason, TimeSlot } from '@/types'

/**
 * 云函数出入参契约。
 *
 * 本轮定死这些类型即是前后端约定 —— 下一轮实现业务逻辑时只换实现、不改签名，
 * 云函数侧（cloud/functions/*）按同一份字段写。
 */

export interface LoginRequest {
  /** 小程序启动场景值，用于来源归因 */
  scene?: number
  /** 小程序码参数里的渠道码，如 grp1。服务端会限长限字符后才入库 */
  channel?: string
}

export interface LoginResponse {
  /** 由云开发从调用上下文取得，客户端无需任何授权 */
  openid: string
  /** 是否首次打开。为 true 时服务端刚建完档 */
  isNew: boolean
}

export interface GetGreetingsRequest {
  slot: string
  /**
   * 当天已展示过的 id。
   * 服务端**只用它排序，不用它过滤** —— 见下方响应说明。
   */
  excludeIds: string[]
}

export interface GetGreetingsResponse {
  /**
   * 该时段的候选集，没看过的排在前面、看过的垫底。
   *
   * **服务端保证不因 excludeIds 而返回空数组**：只要库里该时段有文案，
   * 这里就一定非空。客户端因此可以在本地重试，不需要再发一次请求。
   * 早先服务端直接过滤已看过的，当天看完后返回空，客户端顶部就空着。
   */
  greetings: Greeting[]
}

export interface HeartbeatRequest {
  /** 客户端时间戳，仅用于排障，在线判定以服务端时间为准 */
  clientNow: number
}

export interface HeartbeatResponse {
  ok: boolean
}

export interface ProvincePresence {
  /** 省级行政区名，与 src/assets/map/provinces.json 的 key 对齐，否则地图上点不亮 */
  province: string
  count: number
}

export interface GetOnlineCountResponse {
  /** 30 秒内有心跳的用户数（PRD F4） */
  count: number
  /** 省份分布。聚合后只剩「省份 → 人数」，反推不到具体是谁 */
  provinces: ProvincePresence[]
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
  fromTimerSeconds?: number
  length?: number
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
  /**
   * 由云函数从 CLIENTIP 反查，只到省级。解析不出时该字段缺失（不点亮总好过点错）。
   * 用省而不是市：IP 定位在省级准确率高得多，城市级常落到运营商出口城市。
   */
  province?: string
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
export type GreetingSeed = Omit<GreetingDoc, '_id' | 'enabled' | 'createdAt'> & { id: Greeting['id'] }
