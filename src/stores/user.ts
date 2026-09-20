import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  /**
   * 静默登录。openid 由云开发在云函数侧从上下文直接取得，
   * 客户端不需要任何授权动作。
   */
  async function silentLogin(): Promise<void> {
    // TODO(下一轮): 调用云函数取 openid，写入 users 集合（first_open_at / last_open_at / source）
    await Promise.resolve()
  }

  function setSource(scene: number, channel: string): void {
    source.value = channel ? `${scene}:${channel}` : String(scene)
  }

  return { openid, isNew, source, silentLogin, setSource }
})
