import type { ProvincePresence } from '@/cloud/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getOnlineCount, heartbeat } from '@/cloud/api'
import { resolvePresenceLabel } from '@/utils/presence'

/** PRD F4：心跳每 20 秒一次，仅在前台发送。 */
const HEARTBEAT_INTERVAL_MS = 20_000
/** PRD F4：客户端每 30 秒拉一次在线数。 */
const REFRESH_INTERVAL_MS = 30_000

export const usePresenceStore = defineStore('presence', () => {
  const count = ref(0)
  /** 省份分布，喂给地图点亮光点 */
  const provinces = ref<ProvincePresence[]>([])
  const label = computed(() => resolvePresenceLabel(count.value))

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function refresh(): Promise<void> {
    try {
      const res = await getOnlineCount()
      count.value = res.count
      provinces.value = res.provinces ?? []
    }
    catch {
      // 拉不到就维持上一次的数字，不要把「有人陪」变成 0
    }
    // TODO(下一轮): 埋点 online_show（count + shown）
  }

  async function sendHeartbeat(): Promise<void> {
    try {
      await heartbeat()
    }
    catch {
      // 心跳失败静默，下一轮会补上
    }
  }

  /** 仅在前台调用：PRD F4 要求后台不发心跳，否则在线数会虚高。 */
  function startHeartbeat(): void {
    if (heartbeatTimer)
      return
    void sendHeartbeat()
    void refresh()
    heartbeatTimer = setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS)
    refreshTimer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  return { count, provinces, label, refresh, startHeartbeat, stopHeartbeat }
})
