<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { initCloud } from '@/cloud'
import { useTimerStore } from '@/stores/timer'

const timer = useTimerStore()
let hiddenAt = 0

onLaunch(() => {
  initCloud()
  // TODO(下一轮): 静默登录 + 埋点 app_open（scene / hour / is_new）
})

onShow(() => {
  // 回到前台按真实时间差校正倒计时（PRD F1）
  if (hiddenAt)
    timer.syncFromBackground(hiddenAt)
  hiddenAt = 0
})

onHide(() => {
  hiddenAt = Date.now()
  // TODO(下一轮): onHide 时强制发送攒批的埋点
})
</script>

<style lang="scss">
page {
  background-color: $paper;
  color: $ink;
  font-family: $font-ui;
  font-size: $fs-body;
  line-height: $lh-normal;
  // 隐蔽性：全局低饱和、无强调色（R4）
}

view,
text {
  box-sizing: border-box;
}
</style>
