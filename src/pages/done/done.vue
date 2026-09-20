<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer'
import { formatDuration } from '@/utils/time'

const timer = useTimerStore()

const durationText = computed(() => formatDuration(timer.elapsed))

function backToWork() {
  // TODO(下一轮): 埋点 timer_choice（choice=back）
  timer.reset()
  uni.navigateBack({ delta: 1 })
}

function restAgain() {
  // 沿用上次时长，本次会话最多再歇 2 次（PRD F1）
  timer.again()
  uni.navigateBack({ delta: 1 })
}
</script>

<template>
  <view class="done">
    <view class="done__head">
      <!-- 与倒计时同一套处理：超大字号、细字重、等宽数字 -->
      <text class="done__duration">
        {{ durationText }}
      </text>
      <text class="done__note">
        刚好够脑子转个身
      </text>
    </view>

    <view class="done__action">
      <view class="done__primary" @tap="backToWork">
        <text class="done__primary-text">
          回去干活
        </text>
      </view>

      <!-- 已经再歇满 2 次后，这个按钮就不再出现 -->
      <text v-if="timer.canRestAgain" class="done__secondary" @tap="restAgain">
        再歇一会儿
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.done {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0 $sp-4;
  background-color: $paper;

  // 用 flex 自适应而不是写死 60vh：不同机型的可视高度差异很大，
  // 写死高度会让主按钮在小屏上正好卡在 40% 分界线上（R5）
  &__head {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
  }

  &__duration {
    font-size: $fs-display;
    font-weight: $fw-light;
    line-height: $lh-tight;
    letter-spacing: -4rpx;
    color: $moss;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }

  &__note {
    margin-top: $sp-3;
    font-size: $fs-greeting;
    color: $ink;
  }

  // 主按钮落在屏幕下 40% 区域
  &__action {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: auto;
    // 补安全区：iPhone 底部手势条会压住主按钮
    padding-bottom: calc(#{$sp-7} + env(safe-area-inset-bottom));
  }

  &__primary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: $sp-3 0;
    background-color: $moss;
    border-radius: $radius-button;
  }

  &__primary-text {
    font-size: $fs-option;
    color: $paper;
  }

  &__secondary {
    margin-top: $sp-4;
    font-size: $fs-option;
    color: $ink-soft;
  }
}
</style>
