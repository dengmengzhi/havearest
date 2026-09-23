import type {
  GetGreetingsRequest,
  GetGreetingsResponse,
  GetOnlineCountResponse,
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
  return { ok: true }
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
  return { count: provinces.reduce((n, p) => n + p.count, 0), provinces }
}

export function mockTrack(req: TrackRequest): TrackResponse {
  return { accepted: req.events.length }
}
