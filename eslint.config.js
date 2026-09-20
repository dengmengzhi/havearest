import uniHelper from '@uni-helper/eslint-config'

export default uniHelper(
  {
    unocss: false,
    ignores: ['dist', 'node_modules', 'unpackage', 'cloud/functions/*/node_modules'],
  },
  {
    // 把 PRD 的隐蔽性与隐私硬约束变成静态检查，别指望走查时记得住。
    files: ['src/**/*.{ts,vue}'],
    rules: {
      'no-restricted-properties': [
        'error',
        // R3 隐蔽性：无声音、无振动、无弹窗、无红点
        { object: 'uni', property: 'showToast', message: 'R3 隐蔽性：不允许弹窗提示。用页面内的文字行代替。' },
        { object: 'uni', property: 'showModal', message: 'R3 隐蔽性：不允许弹窗。' },
        { object: 'uni', property: 'showLoading', message: 'R3 隐蔽性：不允许弹窗。用占位态代替。' },
        { object: 'uni', property: 'showActionSheet', message: 'R3 隐蔽性：不允许弹窗。' },
        { object: 'uni', property: 'vibrateShort', message: 'R3 隐蔽性：全局无振动。' },
        { object: 'uni', property: 'vibrateLong', message: 'R3 隐蔽性：全局无振动。' },
        { object: 'uni', property: 'createInnerAudioContext', message: 'R3 隐蔽性：全局无声音。' },
        { object: 'uni', property: 'setTabBarBadge', message: 'R3 隐蔽性：不允许红点/角标。' },
        { object: 'uni', property: 'showTabBarRedDot', message: 'R3 隐蔽性：不允许红点/角标。' },
        // R6 隐私：仅使用 openid
        { object: 'uni', property: 'getUserProfile', message: 'R6 隐私：不获取头像昵称，静默登录即可。' },
        { object: 'uni', property: 'getUserInfo', message: 'R6 隐私：不获取用户信息。' },
        { object: 'uni', property: 'getLocation', message: 'R6 隐私：不获取位置。' },
        { object: 'uni', property: 'chooseLocation', message: 'R6 隐私：不获取位置。' },
        { object: 'uni', property: 'getPhoneNumber', message: 'R6 隐私：不获取手机号。' },
      ],
      // R4 低饱和配色：颜色一律取自 src/styles/tokens.scss
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'R4 配色：不要写裸 hex，请使用 src/styles/tokens.scss 里的 token。',
        },
      ],
    },
  },
)
