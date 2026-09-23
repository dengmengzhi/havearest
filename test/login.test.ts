import { createRequire } from 'node:module'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const require_ = createRequire(import.meta.url)
const { CHANNEL_MAX, buildSource } = require_('../cloud/functions/login/source.js')

const login = vi.fn()
vi.mock('@/cloud/api', () => ({ login: (...a: unknown[]) => login(...a) }))

const { useUserStore } = await import('@/stores/user')

describe('来源归因字符串', () => {
  it('场景值 + 渠道码', () => {
    expect(buildSource(1001, 'grp1')).toBe('1001:grp1')
    expect(buildSource(1047, 'a-b_c')).toBe('1047:a-b_c')
  })

  it('没有渠道码时只留场景值', () => {
    expect(buildSource(1001, '')).toBe('1001')
    expect(buildSource(1001, null)).toBe('1001')
    expect(buildSource(1001, undefined)).toBe('1001')
  })

  it('字符串场景值也能处理', () => {
    expect(buildSource('1001', 'grp1')).toBe('1001:grp1')
  })

  // 渠道码来自小程序码参数，是外部输入 —— 必须限长限字符后才入库
  it('超长渠道码被丢弃', () => {
    expect(buildSource(1001, 'x'.repeat(CHANNEL_MAX + 1))).toBe('1001')
  })

  it('恰好等于上限的渠道码保留', () => {
    const c = 'x'.repeat(CHANNEL_MAX)
    expect(buildSource(1001, c)).toBe(`1001:${c}`)
  })

  it.each([';', ' ', '$', '"', '{', '}', '中文', 'a b', '/', '\\\\'])('含特殊字符的渠道码 %s 被丢弃', (bad) => {
    expect(buildSource(1001, `grp${bad}1`)).toBe('1001')
  })

  it('渠道码两侧空白会被去掉', () => {
    expect(buildSource(1001, '  grp2  ')).toBe('1001:grp2')
  })

  it('非法场景值退化成 0 而不是 NaN', () => {
    expect(buildSource(undefined, undefined)).toBe('0')
    expect(buildSource(Number.NaN, 'x')).toBe('0:x')
    expect(buildSource(-5, 'x')).toBe('0:x')
    expect(buildSource('abc', undefined)).toBe('0')
  })

  it('小数场景值取整', () => {
    expect(buildSource(1001.9, undefined)).toBe('1001')
  })
})

describe('静默登录', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    login.mockReset().mockResolvedValue({ openid: 'o_abc123', isNew: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('成功后写入 openid 与是否新用户', async () => {
    const user = useUserStore()
    await user.silentLogin()

    expect(user.openid).toBe('o_abc123')
    expect(user.isNew).toBe(true)
  })

  it('把启动参数一并上报做来源归因', async () => {
    const user = useUserStore()
    user.setLaunchOptions(1047, 'grp1')
    await user.silentLogin()

    expect(login).toHaveBeenCalledWith({ scene: 1047, channel: 'grp1' })
    expect(user.source).toBe('1047:grp1')
  })

  it('没有渠道码时 source 只有场景值', () => {
    const user = useUserStore()
    user.setLaunchOptions(1001, '')

    expect(user.source).toBe('1001')
  })

  it('异常启动参数不会写出 NaN', () => {
    const user = useUserStore()
    user.setLaunchOptions(Number.NaN, undefined as never)

    expect(user.source).toBe('0')
  })

  // 计时、问候、伪装都不依赖 openid —— 登录失败不该让这些功能不可用
  it('登录失败不抛错，不影响后续使用', async () => {
    login.mockRejectedValue(new Error('云函数炸了'))
    const user = useUserStore()

    await expect(user.silentLogin()).resolves.toBeUndefined()
    expect(user.openid).toBe('')
  })

  it('登录失败也照样分配头像 —— 它只读本地，不该等网络', async () => {
    login.mockRejectedValue(new Error('云函数炸了'))
    const user = useUserStore()
    await user.silentLogin()

    expect(user.avatar.id).toMatch(/^fish-\d+$/)
  })

  it('头像在登录之前就定下来，openid 到达后不跳变', async () => {
    let resolveLogin: (v: unknown) => void = () => {}
    login.mockReturnValue(new Promise((r) => {
      resolveLogin = r
    }))

    const user = useUserStore()
    // 登录前本地还没有分配记录
    expect(uni.getStorageSync('havearest:fishId')).toBeFalsy()

    const pending = user.silentLogin()

    // 登录还没回来，分配就必须已经落盘了 —— 断言存储而不是 avatar.id，
    // 因为 avatar 的初始值本来就是第一条鱼，光看它区分不出「已分配」和「还没分配」
    const persisted = uni.getStorageSync('havearest:fishId')
    expect(persisted).toBeTruthy()
    const before = user.avatar.id
    expect(before).toBe(persisted)

    resolveLogin({ openid: 'o_completely_different', isNew: false })
    await pending

    expect(user.avatar.id).toBe(before)
    expect(uni.getStorageSync('havearest:fishId')).toBe(persisted)
  })
})
