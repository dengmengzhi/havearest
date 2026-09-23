<script setup lang="ts">
import type { DurationMinutes } from '@/types'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { onUnmounted, ref, watch } from 'vue'
import DisguiseLayer from '@/components/DisguiseLayer.vue'
import GreetingLine from '@/components/GreetingLine.vue'
import PresenceDot from '@/components/PresenceDot.vue'
import PresenceMap from '@/components/PresenceMap.vue'
import TimerBar from '@/components/TimerBar.vue'
import { useGreetingStore } from '@/stores/greeting'
import { usePresenceStore } from '@/stores/presence'
import { useTimerStore } from '@/stores/timer'
import { useUserStore } from '@/stores/user'

const greeting = useGreetingStore()
const presence = usePresenceStore()
const timer = useTimerStore()
const user = useUserStore()

const disguised = ref(false)

/** PRD F1：到点提示停留 2 秒再跳转。 */
const NOTIFY_HOLD_MS = 2000

/**
 * 首屏内容只拉一次。
 *
 * onShow 在每次页面显示时都会触发，包括从结束页 navigateBack 回来 ——
 * 那时如果重新 pick，「再歇一会儿」就会换掉问候语。
 */
let contentLoaded = false
let notifyTimer: ReturnType<typeof setTimeout> | null = null

onShow(() => {
  if (!contentLoaded) {
    contentLoaded = true
    // 头像先定下来再拉内容：它只读本地、是同步的，不该等网络
    user.resolveAvatar()
    void greeting.pick()
  }
  // 心跳只在前台发送，否则在线数会虚高（PRD F4）
  presence.startHeartbeat()
})

// 到点：提示行浮出 2 秒后进入结束页。无声音、无振动、不弹窗（R3）
watch(() => timer.status, (status) => {
  // 任何离开 notifying 的迁移都要撤销待跳转：提示的这 2 秒里用户可能手动结束，
  // 或者直接选了新时长重新开始，这时再跳结束页就是错的
  if (status !== 'notifying') {
    clearNotifyTimer()
    return
  }
  notifyTimer = setTimeout(() => {
    timer.finish('timeout')
    uni.navigateTo({ url: '/pages/done/done' })
  }, NOTIFY_HOLD_MS)
})

function clearNotifyTimer() {
  if (notifyTimer) {
    clearTimeout(notifyTimer)
    notifyTimer = null
  }
}

onUnload(() => {
  clearNotifyTimer()
  timer.stopTick()
})

onUnmounted(() => {
  clearNotifyTimer()
  presence.stopHeartbeat()
  timer.stopTick()
})

function onSelectDuration(minutes: DurationMinutes) {
  timer.start(minutes)
}

function onStop() {
  clearNotifyTimer()
  // 提示期间点「结束」只是提前跳转，本次小憩其实是走完了的，
  // reason 仍记 timeout，否则埋点里的 timeout/manual 分布会失真
  timer.finish(timer.status === 'notifying' ? 'timeout' : 'manual')
  uni.navigateTo({ url: '/pages/done/done' })
}

function openDisguise() {
  disguised.value = true
  // TODO(下一轮): 埋点 disguise_on（from_timer_seconds）
}

function openAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}
</script>

<template>
  <view class="home">
    <view class="home__top">
      <!-- 左上角是分配到的那条鱼，兼作关于页入口；右上角是伪装层 -->
      <image
        class="home__avatar"
        :src="user.avatar.src"
        mode="aspectFit"
        :alt="user.avatar.name"
        @tap="openAbout"
      />
      <text class="home__icon" @tap="openDisguise">
        ▤
      </text>
    </view>

    <view class="home__head">
      <GreetingLine :text="greeting.text" />
      <PresenceDot :text="presence.label.text" />
    </view>

    <!-- 中间：全国分布图，点亮此刻有人在小憩的省份 -->
    <view class="home__stage">
      <text v-if="timer.status === 'notifying'" class="home__notify">
        该回去了，今天歇得刚刚好
      </text>
      <PresenceMap v-else :provinces="presence.provinces" />
    </view>

    <view class="home__action">
      <TimerBar
        :is-running="timer.status === 'running' || timer.status === 'notifying'"
        :selected="timer.duration"
        :countdown-text="timer.countdownText"
        @select="onSelectDuration"
        @stop="onStop"
      />
    </view>

    <DisguiseLayer :visible="disguised" @close="disguised = false" />
  </view>
</template>

<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0 $sp-4;
  background-color: $paper;

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // 给自定义导航栏留出状态栏高度
    padding-top: 88rpx;
  }

  &__icon {
    padding: $sp-2;
    font-size: $fs-option;
    color: $ink-soft;
  }

  // 尺寸和右上角的伪装图标看齐，保持克制
  &__avatar {
    width: $avatar-size;
    height: $avatar-size;
  }

  &__head {
    margin-top: $sp-4;
  }

  // 中间区。flex: 1 吃掉剩余空间，把控制条顶到底部
  // （R5：主按钮必须落在屏幕下 40% 区域）
  &__stage {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: $sp-4 0;
  }

  // 中间现在只剩它，字号比原先在卡片上方时大一档
  &__notify {
    font-size: $fs-greeting;
    color: $moss;
    text-align: center;
  }

  // margin-top:auto 把控制条钉在屏幕底部，不论上方内容多高
  // （PRD 非功能·可用性：主按钮在屏幕下 40% 区域，单手可达）
  &__action {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    // 补安全区：iPhone 底部手势条会压住控制条
    padding: $sp-4 0 calc(#{$sp-6} + env(safe-area-inset-bottom));
  }
}
</style>
