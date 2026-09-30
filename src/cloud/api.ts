import type {
  FinishSessionRequest,
  FinishSessionResponse,
  GetGreetingsRequest,
  GetGreetingsResponse,
  GetOnlineCountResponse,
  GetRankingResponse,
  HeartbeatResponse,
  LoginRequest,
  LoginResponse,
  TrackRequest,
  TrackResponse,
} from './types'
import { callFunction, isMockMode } from './index'
import {
  mockFinishSession,
  mockGetGreetings,
  mockGetOnlineCount,
  mockGetRanking,
  mockHeartbeat,
  mockLogin,
  mockTrack,
} from './mock'

/**
 * 云函数调用的唯一出口。
 *
 * 每个方法都先看 isMockMode()：没有云开发环境时直接走本地替身，
 * 这样 UI 开发与走查不依赖后端就绪。函数名与 cloud/functions/ 下的目录名一一对应。
 */

export async function login(req: LoginRequest): Promise<LoginResponse> {
  if (isMockMode())
    return mockLogin()
  return callFunction<LoginResponse>('login', { ...req })
}

export async function getGreetings(req: GetGreetingsRequest): Promise<GetGreetingsResponse> {
  if (isMockMode())
    return mockGetGreetings(req)
  return callFunction<GetGreetingsResponse>('getGreetings', { ...req })
}

/**
 * @param first 是否是本次进入前台的第一跳。
 *   只有第一跳才把省份写进用户档案 —— 每 20 秒写一次纯属浪费写次数。
 */
export async function heartbeat(first = false): Promise<HeartbeatResponse> {
  if (isMockMode())
    return mockHeartbeat()
  return callFunction<HeartbeatResponse>('heartbeat', { clientNow: Date.now(), first })
}

export async function finishSession(req: FinishSessionRequest): Promise<FinishSessionResponse> {
  if (isMockMode())
    return mockFinishSession()
  return callFunction<FinishSessionResponse>('finishSession', { ...req })
}

export async function getRanking(): Promise<GetRankingResponse> {
  if (isMockMode())
    return mockGetRanking()
  return callFunction<GetRankingResponse>('getRanking')
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
