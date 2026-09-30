import type { ProvincePresence } from '@/cloud/types'
import type { PresenceLabel } from '@/utils/presence'
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
  /** 我所在的省份，由云函数按 IP 解析后下发。客户端自己不做任何定位 */
  const myProvince = ref('')
  /** 今天来过的人次。瞬时在线太单薄，累计才看得出人气 */
  const todayCount = ref(0)
  /** 是否成功拉到过一次数据。没拉到之前不能声称「还没有人」—— 那是把失败说成了事实 */
  const loaded = ref(false)
  const label = computed<PresenceLabel>(() =>
    loaded.value ? resolvePresenceLabel(count.value) : { text: '', shown: false },
  )

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function refresh(): Promise<void> {
    try {
      const res = await getOnlineCount()
      count.value = res.count
      provinces.value = res.provinces ?? []
      todayCount.value = res.todayCount ?? 0
      loaded.value = true
    }
    catch {
      // 拉不到就维持上一次的数字，不要把「有人陪」变成 0
    }
    // TODO(下一轮): 埋点 online_show（count + shown）
  }

  /** @param first 本次进入前台的第一跳。只有它会把省份记到用户档案上（排行榜要用） */
  async function sendHeartbeat(first = false): Promise<void> {
    try {
      const res = await heartbeat(first)
      // 解析不出就保留上一次的值：位置不会在 20 秒内变，
      // IP 库偶发查不到不该让「你在这里」忽然消失
      if (res.province)
        myProvince.value = res.province
    }
    catch {
      // 心跳失败静默，下一轮会补上
    }
  }

  /** 仅在前台调用：PRD F4 要求后台不发心跳，否则在线数会虚高。 */
  function startHeartbeat(): void {
    if (heartbeatTimer)
      return
    // 先写心跳、再拉人数。并发发的话第一次查询很可能还没看见自己的那条心跳，
    // 首屏就会显示「此刻还没有人在小憩」，而其实我自己就在线
    void (async () => {
      await sendHeartbeat(true)
      await refresh()
    })()
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

  return { count, provinces, myProvince, todayCount, loaded, label, refresh, startHeartbeat, stopHeartbeat }
})
