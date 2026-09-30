/**
 * 给 JS 用的颜色常量。
 *
 * 绝大多数颜色应该走 src/styles/tokens.scss ——
 * 但有些地方拿不到 scss 变量：地图 marker 的 callout 是通过 JS 对象配的，
 * 不经过样式表。这类值集中在这里，而不是散落在组件里写裸 hex（R4）。
 *
 * ⚠️ 这里的值必须与 tokens.scss 保持一致，test/colors.test.ts 有用例守着。
 */

/** = tokens.scss 的 $ink */
export const INK = '#2c322e'

/** = tokens.scss 的 $card */
export const CARD = '#f5f5f1'

/** = tokens.scss 的 $moss */
export const MOSS = '#4f6154'

/**
 * = tokens.scss 的 $hairline，但换成六位十六进制。
 * 地图 callout 的 borderColor 不接受 rgba()，只能给纯色，
 * 所以这里是 $hairline 在 $paper 背景上混合后的等效值。
 */
export const HAIRLINE = '#d3d5d0'
