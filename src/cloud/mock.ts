import type {
  FinishSessionResponse,
  GetGreetingsRequest,
  GetGreetingsResponse,
  GetOnlineCountResponse,
  GetRankingResponse,
  HeartbeatResponse,
  LoginResponse,
  TrackRequest,
  TrackResponse,
} from './types'
import type { Greeting } from '@/types'
import greetingsJson from '@/assets/fallback/greetings.json'
import { takeUnseen } from '@/utils/dedupe'

/**
 * 无云开发环境时的替身，让 dev:h5 与未配 env 的小程序端都能跑通 UI。
 * 返回结构与真实云函数完全一致，切换时调用方无需改动。
 */

const greetings = greetingsJson.items as Greeting[]

/** 本地走查用的假身份。openid 给个固定值，好让头像分配在本地也稳定。 */
export function mockLogin(): LoginResponse {
  return { openid: 'mock-openid-local-dev', isNew: false }
}

export function mockGetGreetings(req: GetGreetingsRequest): GetGreetingsResponse {
  const pool = greetings.filter(g => g.slot === req.slot)
  return { greetings: takeUnseen(pool, req.excludeIds, pool.length) }
}

export function mockHeartbeat(): HeartbeatResponse {
  // 本地走查时假装在广东，好看到「你在这里」的效果
  return { ok: true, province: '广东' }
}

/** 给一份看起来合理的分布，便于本地走查地图的三档光点。 */
export function mockGetOnlineCount(): GetOnlineCountResponse {
  const provinces = [
    { province: '广东', count: 11 },
    { province: '北京', count: 9 },
    { province: '上海', count: 7 },
    { province: '浙江', count: 5 },
    { province: '江苏', count: 4 },
    { province: '四川', count: 3 },
    { province: '湖北', count: 2 },
    { province: '陕西', count: 2 },
    { province: '福建', count: 2 },
    { province: '湖南', count: 1 },
    { province: '黑龙江', count: 1 },
    { province: '新疆', count: 1 },
  ]
  const count = provinces.reduce((n, p) => n + p.count, 0)
  return { count, provinces, todayCount: 340 }
}

export function mockFinishSession(): FinishSessionResponse {
  return { ok: true }
}

/** 一份看起来合理的榜单，便于本地走查名次、并列、「你」那一行的样式。 */
export function mockGetRanking(): GetRankingResponse {
  const raw = [
    { province: '广东', seconds: 9420, sessions: 21 },
    { province: '浙江', seconds: 7800, sessions: 18 },
    { province: '北京', seconds: 7800, sessions: 15 },
    { province: '江苏', seconds: 5400, sessions: 12 },
    { province: '四川', seconds: 4260, sessions: 11 },
    { province: '上海', seconds: 3600, sessions: 9 },
    { province: '湖北', seconds: 2700, sessions: 7 },
    { province: '', seconds: 1800, sessions: 5 },
  ]
  // 并列同名次、下一名跳号，和云函数 rank.js 的记法保持一致
  const entries = raw.map((r, i) => ({
    ...r,
    rank: i > 0 && raw[i - 1].seconds === r.seconds ? i : i + 1,
    mine: false,
  }))
  // 本地走查时假装自己排在榜外，好看到底部那张「我的名次」卡片
  return { entries, mine: { rank: 27, province: '广东', seconds: 900, sessions: 3, mine: true } }
}

export function mockTrack(req: TrackRequest): TrackResponse {
  return { accepted: req.events.length }
}
