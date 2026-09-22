/**
 * 鱼头像分配。
 *
 * 注意与 PRD 的关系：F5 与隐私条款禁止的是**获取**微信头像昵称，
 * 这里是产品自己生成并分配的标识，不读取任何用户资料、不需要任何授权。
 * F4「不展示任何身份、头像、地区」约束的是**他人**，不影响给自己一条鱼。
 *
 * 分配规则：由 seed 稳定哈希推导，同一个 seed 永远得到同一条鱼 ——
 * 头像要能当身份用，每次进来都换就失去意义了。
 */

export interface FishAvatar {
  id: string
  /** 中文名，用于无障碍朗读与排障，不直接展示 */
  name: string
  /**
   * 静态资源路径。不用 base64 data URI：微信官方文档只明确支持文件路径，
   *  且 base64 会让体积膨胀约三分之一
   */
  src: string
}

/** 与 src/static/fish/*.svg 一一对应，顺序即索引，插入新鱼请追加到末尾。 */
export const FISH_AVATARS: readonly FishAvatar[] = [
  { id: 'fish-01', name: '苔绿条纹', src: '/static/fish/fish-01.svg' },
  { id: 'fish-02', name: '土黄扇尾', src: '/static/fish/fish-02.svg' },
  { id: 'fish-03', name: '灰蓝分叉', src: '/static/fish/fish-03.svg' },
  { id: 'fish-04', name: '豆沙扇尾', src: '/static/fish/fish-04.svg' },
  { id: 'fish-05', name: '橄榄小鱼', src: '/static/fish/fish-05.svg' },
  { id: 'fish-06', name: '石板长鱼', src: '/static/fish/fish-06.svg' },
  { id: 'fish-07', name: '苔绿河豚', src: '/static/fish/fish-07.svg' },
  { id: 'fish-08', name: '土黄分叉', src: '/static/fish/fish-08.svg' },
  { id: 'fish-09', name: '灰蓝三角', src: '/static/fish/fish-09.svg' },
  { id: 'fish-10', name: '豆沙河豚', src: '/static/fish/fish-10.svg' },
  { id: 'fish-11', name: '橄榄扇尾', src: '/static/fish/fish-11.svg' },
  { id: 'fish-12', name: '石板分叉', src: '/static/fish/fish-12.svg' },
]

/**
 * FNV-1a 变体。选它不是为了密码学强度，只要满足两点：
 * 同一输入结果恒定、相近输入（openid 往往只差几个字符）结果分散。
 */
function hashSeed(seed: string): number {
  let hash = 0x811C9DC5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    // 乘 16777619 用移位写，避免大数乘法溢出成浮点
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0
  }
  return hash >>> 0
}

/**
 * 按 seed 取一条鱼。seed 通常是 openid；openid 尚未就绪时由调用方传本地种子。
 * 空 seed 返回第一条而不是抛错 —— 头像拿不到不该让首页崩掉。
 */
export function resolveFish(seed: string): FishAvatar {
  if (!seed)
    return FISH_AVATARS[0]
  return FISH_AVATARS[hashSeed(seed) % FISH_AVATARS.length]
}

/** 按 id 找回，用于读取本地已分配的结果。找不到时返回 null 交给调用方决定。 */
export function findFishById(id: string): FishAvatar | null {
  return FISH_AVATARS.find(f => f.id === id) ?? null
}

/**
 * 生成本地种子。
 *
 * openid 由云函数下发，首次打开时可能还没拿到，但头像要立刻显示。
 * 此时先用本地种子分配并持久化，保证「首次分配后固定」——
 * 否则 openid 到达前后会换一条鱼，用户会看到头像跳变。
 */
export function generateLocalSeed(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
