import type {
  GetCardsRequest,
  GetCardsResponse,
  GetGreetingsRequest,
  GetGreetingsResponse,
  GetOnlineCountResponse,
  HeartbeatResponse,
  TrackRequest,
  TrackResponse,
} from './types'
import type { Greeting, NapCard } from '@/types'
import cardsJson from '@/assets/fallback/cards.json'
import greetingsJson from '@/assets/fallback/greetings.json'
import { takeUnseen } from '@/utils/dedupe'

/**
 * 无云开发环境时的替身，让 dev:h5 与未配 env 的小程序端都能跑通 UI。
 * 返回结构与真实云函数完全一致，切换时调用方无需改动。
 */

const cards = cardsJson.items as NapCard[]
const greetings = greetingsJson.items as Greeting[]

export function mockGetCards(req: GetCardsRequest): GetCardsResponse {
  const picked = takeUnseen(cards, req.excludeIds, req.limit)
  if (picked.length === 0)
    return { cards: takeUnseen(cards, [], req.limit), exhausted: true }
  return { cards: picked, exhausted: false }
}

export function mockGetGreetings(req: GetGreetingsRequest): GetGreetingsResponse {
  const pool = greetings.filter(g => g.slot === req.slot)
  return { greetings: takeUnseen(pool, req.excludeIds, pool.length) }
}

export function mockHeartbeat(): HeartbeatResponse {
  return { ok: true }
}

/** 给一个看起来合理的在线人数，便于本地走查两种文案分支（PRD F4）。 */
export function mockGetOnlineCount(): GetOnlineCountResponse {
  return { count: 41 }
}

export function mockTrack(req: TrackRequest): TrackResponse {
  return { accepted: req.events.length }
}
