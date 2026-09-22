import type { FishAvatar } from '@/utils/avatar'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { findFishById, FISH_AVATARS, generateLocalSeed, resolveFish } from '@/utils/avatar'
import { readStorage, StorageKeys, writeStorage } from '@/utils/storage'

/**
 * 用户。
 *
 * PRD F5 / 非功能·隐私：云开发自动获取 openid，**不弹授权、不要手机号、
 * 不要头像昵称**。因此这里没有任何 getUserProfile 之类的调用，
 * 也不应该在后续版本里加进来。
 */
export const useUserStore = defineStore('user', () => {
  const openid = ref('')
  const isNew = ref(false)
  /** 首次来源：scene 值 + 分享参数中的渠道码（如 ch=grp1） */
  const source = ref('')
  /** 分配到的鱼。不是微信头像，是产品生成的标识，不需要任何授权 */
  const avatar = ref<FishAvatar>(FISH_AVATARS[0])

  /**
   * 确定这个用户是哪条鱼。
   *
   * 「首次分配后固定」：分配结果直接落本地，之后只读不再重算 ——
   * openid 是异步拿到的，如果每次都按当前 openid 现算，
   * openid 到达前后会换一条鱼，用户会看到头像跳变。
   */
  function resolveAvatar(): void {
    const cachedId = readStorage(StorageKeys.fishId, '')
    const cached = cachedId ? findFishById(cachedId) : null
    if (cached) {
      avatar.value = cached
      return
    }

    // openid 优先（换设备也是同一条鱼）；还没拿到就用本地种子顶上
    let seed = openid.value
    if (!seed) {
      seed = readStorage(StorageKeys.avatarSeed, '')
      if (!seed) {
        seed = generateLocalSeed()
        writeStorage(StorageKeys.avatarSeed, seed)
      }
    }

    avatar.value = resolveFish(seed)
    writeStorage(StorageKeys.fishId, avatar.value.id)
  }

  /**
   * 静默登录。openid 由云开发在云函数侧从上下文直接取得，
   * 客户端不需要任何授权动作。
   */
  async function silentLogin(): Promise<void> {
    // TODO(下一轮): 调用云函数取 openid，写入 users 集合（firstOpenAt / lastOpenAt / source）
    await Promise.resolve()
    resolveAvatar()
  }

  function setSource(scene: number, channel: string): void {
    source.value = channel ? `${scene}:${channel}` : String(scene)
  }

  return { openid, isNew, source, avatar, silentLogin, resolveAvatar, setSource }
})
