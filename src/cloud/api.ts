import type {
  GetGreetingsRequest,
  GetGreetingsResponse,
  GetOnlineCountResponse,
  HeartbeatResponse,
  LoginRequest,
  LoginResponse,
  TrackRequest,
  TrackResponse,
} from './types'
import { callFunction, isMockMode } from './index'
import {
  mockGetGreetings,
  mockGetOnlineCount,
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
