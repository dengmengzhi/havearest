import type { RankingEntry } from '@/cloud/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getRanking } from '@/cloud/api'

/**
 * 累计小憩时长排行榜。
 *
 * 只在排行榜页面按需拉取 —— 它不像在线人数那样需要轮询，
 * 累计值是慢变量，进页面看一次就够。
 */
export const useRankingStore = defineStore('ranking', () => {
  const entries = ref<RankingEntry[]>([])
  /** 我那一行。进榜时和 entries 里的同一条，没进榜时是单独算出来的真实名次 */
  const mine = ref<RankingEntry | null>(null)
  const loading = ref(false)
  /** 是否成功拉到过一次。没拉到之前不能显示「还没有人上榜」—— 那是把失败说成事实 */
  const loaded = ref(false)
  const failed = ref(false)

  async function load(): Promise<void> {
    loading.value = true
    try {
      const res = await getRanking()
      entries.value = res.entries ?? []
      mine.value = res.mine ?? null
      loaded.value = true
      failed.value = false
    }
    catch {
      // 保留上一次的榜单：拉不到不等于榜是空的
      failed.value = !loaded.value
    }
    finally {
      loading.value = false
    }
  }

  return { entries, mine, loading, loaded, failed, load }
})
