import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  platform: {
    default: 'mp-weixin',
    alias: {
      'h5': ['h5', 'h'],
      'mp-weixin': ['wx', 'weixin'],
    },
  },
})
