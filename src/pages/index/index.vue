<script setup lang="ts">
import type { DurationMinutes } from '@/types'
import { onShow } from '@dcloudio/uni-app'
import { onUnmounted, ref } from 'vue'
import DisguiseLayer from '@/components/DisguiseLayer.vue'
import GreetingLine from '@/components/GreetingLine.vue'
import NapCard from '@/components/NapCard.vue'
import PresenceDot from '@/components/PresenceDot.vue'
import TimerBar from '@/components/TimerBar.vue'
import { useCardsStore } from '@/stores/cards'
import { useGreetingStore } from '@/stores/greeting'
import { usePresenceStore } from '@/stores/presence'
import { useTimerStore } from '@/stores/timer'

const cards = useCardsStore()
const greeting = useGreetingStore()
const presence = usePresenceStore()
const timer = useTimerStore()

const disguised = ref(false)

onShow(() => {
  void greeting.pick()
  void cards.fetch()
  // 心跳只在前台发送，否则在线数会虚高（PRD F4）
  presence.startHeartbeat()
})

onUnmounted(() => {
  presence.stopHeartbeat()
})

function onSelectDuration(minutes: DurationMinutes) {
  timer.start(minutes)
  // TODO(下一轮): 倒计时归零后浮出提示行，2 秒后 redirectTo 结束页
}

function onStop() {
  timer.finish('manual')
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
      <!-- 左上角进关于，右上角进伪装层：都用不起眼的小图标 -->
      <text class="home__icon" @tap="openAbout">
        ◦
      </text>
      <text class="home__icon" @tap="openDisguise">
        ▤
      </text>
    </view>

    <view class="home__head">
      <GreetingLine :text="greeting.text" />
      <PresenceDot :text="presence.label.text" />
    </view>

    <view class="home__stage">
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
        :is-running="timer.isRunning"
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
