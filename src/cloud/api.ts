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
import { callFunction, isMockMode } from './index'
import {
  mockGetCards,
  mockGetGreetings,
  mockGetOnlineCount,
  mockHeartbeat,
  mockTrack,
} from './mock'

/**
 * 云函数调用的唯一出口。
 *
 * 每个方法都先看 isMockMode()：没有云开发环境时直接走本地替身，
 * 这样 UI 开发与走查不依赖后端就绪。函数名与 cloud/functions/ 下的目录名一一对应。
 */

export async function getCards(req: GetCardsRequest): Promise<GetCardsResponse> {
  if (isMockMode())
    return mockGetCards(req)
  return callFunction<GetCardsResponse>('getCards', { ...req })
}

export async function getGreetings(req: GetGreetingsRequest): Promise<GetGreetingsResponse> {
  if (isMockMode())
    return mockGetGreetings(req)
  return callFunction<GetGreetingsResponse>('getGreetings', { ...req })
}

export async function heartbeat(): Promise<HeartbeatResponse> {
  if (isMockMode())
    return mockHeartbeat()
  return callFunction<HeartbeatResponse>('heartbeat', { clientNow: Date.now() })
}

export async function getOnlineCount(): Promise<GetOnlineCountResponse> {
  if (isMockMode())
    return mockGetOnlineCount()
  return callFunction<GetOnlineCountResponse>('getOnlineCount')
}

export async function sendTrack(req: TrackRequest): Promise<TrackResponse> {
  if (isMockMode())
    return mockTrack(req)
  return callFunction<TrackResponse>('track', { ...req })
}
