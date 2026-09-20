import type { NapCard } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCards } from '@/cloud/api'
import { appendSeen } from '@/utils/dedupe'
import { readStorage, StorageKeys, writeStorage } from '@/utils/storage'

/** PRD F3：每次进入随机取 20 张未看过的卡。 */
const FETCH_SIZE = 20
/** PRD F3：excludeIds 只带最近 200 个，避免请求体无限增长。 */
const SEEN_LIMIT = 200
/** PRD F3：断网时至少还能看 10 张。 */
const OFFLINE_CACHE_SIZE = 10

export const useCardsStore = defineStore('cards', () => {
  const list = ref<NapCard[]>([])
  const index = ref(0)
  const seenIds = ref<string[]>(readStorage(StorageKeys.seenCardIds, [] as string[]))
  const isOffline = ref(false)

  const current = computed<NapCard | null>(() => list.value[index.value] ?? null)
  const hasNext = computed(() => index.value < list.value.length - 1)
  const hasPrev = computed(() => index.value > 0)

  async function fetch(): Promise<void> {
    try {
      const res = await getCards({ excludeIds: seenIds.value, limit: FETCH_SIZE })
      list.value = res.cards
      index.value = 0
      isOffline.value = false

      // 池子看完了，服务端已重置，本地已看列表同步清空
      if (res.exhausted)
        resetSeen()

      cacheForOffline(res.cards)
    }
    catch {
      // PRD F3：无网络时展示本地缓存的最近 10 张
      list.value = readStorage(StorageKeys.cachedCards, [] as NapCard[])
      index.value = 0
      isOffline.value = true
    }
  }

  function next(): void {
    if (hasNext.value) {
      index.value += 1
      markSeen()
    }
    // TODO(下一轮): 埋点 card_view / card_dwell；预加载之后 3 张的图片
  }

  function prev(): void {
    if (hasPrev.value)
      index.value -= 1
  }

  function markSeen(): void {
    const card = current.value
    if (!card)
      return
    seenIds.value = appendSeen(seenIds.value, [card.id], SEEN_LIMIT)
    writeStorage(StorageKeys.seenCardIds, seenIds.value)
  }

  function resetSeen(): void {
    seenIds.value = []
    writeStorage(StorageKeys.seenCardIds, seenIds.value)
  }

  function cacheForOffline(cards: NapCard[]): void {
    writeStorage(StorageKeys.cachedCards, cards.slice(0, OFFLINE_CACHE_SIZE))
  }

  return { list, index, seenIds, isOffline, current, hasNext, hasPrev, fetch, next, prev, markSeen, resetSeen }
})
