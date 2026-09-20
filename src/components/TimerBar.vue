<script setup lang="ts">
import type { DurationMinutes } from '@/types'
import { DURATION_OPTIONS } from '@/types'

defineProps<{
  isRunning: boolean
  selected: DurationMinutes
  countdownText: string
}>()

const emit = defineEmits<{
  select: [minutes: DurationMinutes]
  stop: []
}>()

function onSelect(minutes: DurationMinutes) {
  emit('select', minutes)
}
</script>

<template>
  <!-- 整条控制条落在屏幕下 40% 区域内（PRD 非功能·可用性：单手竖屏可达） -->
  <view class="bar">
    <!-- 计时中就地替换为倒计时，高度不变，避免布局跳动 -->
    <template v-if="isRunning">
      <text class="bar__countdown">
        {{ countdownText }}
      </text>
      <text class="bar__stop" @tap="emit('stop')">
        结束
      </text>
    </template>

    <template v-else>
      <view class="bar__options">
        <text
          v-for="minutes in DURATION_OPTIONS"
          :key="minutes"
          class="bar__option"
          :class="{ 'bar__option--active': minutes === selected }"
          @tap="onSelect(minutes)"
        >
          {{ minutes }} 分
        </text>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.bar {
  display: flex;
  flex-direction: column;
  align-items: center;

  &__options {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  &__option {
    padding: $sp-2 $sp-5;
    margin: 0 $sp-2;
    font-size: $fs-option;
    color: $ink-soft;
    border: 1rpx solid $hairline;
    border-radius: $radius-button;

    &--active {
      color: $moss;
      background-color: $moss-soft;
      border-color: $moss;
    }
  }

  // 把大胆花在这一处：超大字号 + 细字重 + 负字距。
  // tabular-nums 让每位数字等宽，秒数跳动时整体不抖。
  &__countdown {
    font-size: $fs-display;
    font-weight: $fw-light;
    line-height: $lh-tight;
    letter-spacing: -4rpx;
    color: $moss;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }

  &__stop {
    margin-top: $sp-2;
    font-size: $fs-option;
    color: $ink-soft;
  }
}
</style>
