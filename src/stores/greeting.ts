import type { Greeting, TimeSlot } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getGreetings } from '@/cloud/api'
import { pickUnseen } from '@/utils/dedupe'
import { readStorage, StorageKeys, writeStorage } from '@/utils/storage'
import { resolveSlot } from '@/utils/time'

/** PRD F2：首次使用固定欢迎语。 */
const WELCOME_TEXT = '嗨，我是你的小憩搭子'

export const useGreetingStore = defineStore('greeting', () => {
  const text = ref('')
  const currentId = ref('')
  const slot = ref<TimeSlot>('afternoon')
  const shownIdsToday = ref<string[]>([])

  /**
   * 取一句问候。
   *
   * PRD F2：同一用户当天不重复，用本地已展示 id 列表去重；跨天自动重置。
   * 文案库耗尽时清空重来，而不是让顶部空着。
   */
  async function pick(date: Date = new Date()): Promise<void> {
    slot.value = resolveSlot(date)
    loadShownIds(date)

    if (!readStorage(StorageKeys.hasOpenedBefore, false)) {
      text.value = WELCOME_TEXT
      currentId.value = 'g-welcome'
      writeStorage(StorageKeys.hasOpenedBefore, true)
      return
    }

    try {
      const res = await getGreetings({ slot: slot.value, excludeIds: shownIdsToday.value })
      let picked = pickUnseen(res.greetings, shownIdsToday.value)

      // 当天该时段的文案已全部看过。
      // 候选集是服务端按 excludeIds 过滤后给的，此时它已经是空的，
      // 所以必须清空去重列表后**重新拉一次**，在空数组上重试是取不到的。
      if (!picked) {
        shownIdsToday.value = []
        const refetched = await getGreetings({ slot: slot.value, excludeIds: [] })
        picked = pickUnseen(refetched.greetings, [])
      }

      applyGreeting(picked)
    }
    catch {
      text.value = WELCOME_TEXT
      currentId.value = 'g-welcome'
    }
    // TODO(下一轮): 埋点 greeting_show
  }

  function applyGreeting(picked: Greeting | null): void {
    if (!picked)
      return
    text.value = picked.text
    currentId.value = picked.id
    shownIdsToday.value = [...shownIdsToday.value, picked.id]
    writeStorage(StorageKeys.shownGreetingIds, shownIdsToday.value)
  }

  /** 去重列表按天划分，跨天即失效。 */
  function loadShownIds(date: Date): void {
    const today = date.toDateString()
    const storedDate = readStorage(StorageKeys.greetingDate, '')

    if (storedDate !== today) {
      shownIdsToday.value = []
      writeStorage(StorageKeys.greetingDate, today)
      writeStorage(StorageKeys.shownGreetingIds, [])
      return
    }

    shownIdsToday.value = readStorage(StorageKeys.shownGreetingIds, [] as string[])
  }

  return { text, currentId, slot, shownIdsToday, pick }
})
