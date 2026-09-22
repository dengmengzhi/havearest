<script setup lang="ts">
import type { DurationMinutes } from '@/types'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { onUnmounted, ref, watch } from 'vue'
import DisguiseLayer from '@/components/DisguiseLayer.vue'
import GreetingLine from '@/components/GreetingLine.vue'
import NapCard from '@/components/NapCard.vue'
import PresenceDot from '@/components/PresenceDot.vue'
import TimerBar from '@/components/TimerBar.vue'
import { useCardsStore } from '@/stores/cards'
import { useGreetingStore } from '@/stores/greeting'
import { usePresenceStore } from '@/stores/presence'
import { useTimerStore } from '@/stores/timer'
import { useUserStore } from '@/stores/user'

const cards = useCardsStore()
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
 * 那时如果重新 pick/fetch，「再歇一会儿」就会换掉问候语、把卡片位置冲回第一张。
 */
let contentLoaded = false
let notifyTimer: ReturnType<typeof setTimeout> | null = null

onShow(() => {
  if (!contentLoaded) {
    contentLoaded = true
    // 头像先定下来再拉内容：它只读本地、是同步的，不该等网络
    user.resolveAvatar()
    void greeting.pick()
    void cards.fetch()
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

    <view class="home__stage">
      <!-- 到点提示：浮在卡片区上方的一行字，2 秒后自动进结束页（PRD F1） -->
      <text v-if="timer.status === 'notifying'" class="home__notify">
        该回去了，今天歇得刚刚好
      </text>

      <!-- 下一张卡从右侧露出一条边，像一叠纸：
           比单纯的弹性动效更直接地说明「后面还有」 -->
      <view v-if="cards.hasNext" class="home__peek" />
      <NapCard v-if="cards.current" :card="cards.current" />
      <view v-else class="home__empty">
        <text class="home__empty-text">
          正在找几张给你
        </text>
      </view>

      <text v-if="cards.isOffline" class="home__offline">
        离线中，先看看之前的
      </text>
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

  // 尺寸和右上角的伪装图标看齐，不喧宾夺主 —— 首页的主体仍然是卡片
  &__avatar {
    width: $avatar-size;
    height: $avatar-size;
  }

  &__head {
    margin-top: $sp-4;
  }

  // 基准 55vh 但允许被压缩：内容总高超过一屏时，先让卡片区让步，
  // 绝不能把底部控制条挤出屏幕（R5 主按钮须落在下 40% 区域）
  &__stage {
    position: relative;
    flex: 0 1 $card-height;
    min-height: 0;
    margin-top: $sp-5;
  }

  &__notify {
    position: absolute;
    // 贴近卡片区、与上方的在线人数拉开距离；absolute 定位不影响常态布局，
    // 不能为了 2 秒的提示把卡片位置挪下去
    top: -$sp-4;
    left: 0;
    z-index: 10;
    font-size: $fs-meta;
    color: $moss;
  }

  &__peek {
    position: absolute;
    top: $sp-2;
    right: -$card-peek;
    bottom: $sp-2;
    width: $card-peek * 2;
    background-color: $card;
    border: 1rpx solid $hairline;
    border-radius: $radius-card;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    border: 1rpx solid $hairline;
    border-radius: $radius-card;
  }

  &__empty-text {
    font-size: $fs-meta;
    color: $ink-soft;
  }

  &__offline {
    display: block;
    margin-top: $sp-2;
    font-size: $fs-meta;
    color: $ink-soft;
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
