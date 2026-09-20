import type { Greeting, NapCard } from '@/types'

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
