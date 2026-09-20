<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <view class="presence">
    <!-- 全站唯一的非用户触发动效：4 秒一次的极慢呼吸，
         是「有人陪」的唯一视觉证据。其余一切保持安静。 -->
    <view class="presence__dot" />
    <text class="presence__text">
      {{ text }}
    </text>
  </view>
</template>

<style scoped lang="scss">
.presence {
  display: flex;
  align-items: center;
  margin-top: $sp-2;

  &__dot {
    width: 12rpx;
    height: 12rpx;
    margin-right: $sp-1;
    border-radius: 50%;
    background-color: $ember;
    animation: breath $dur-breath ease-in-out infinite;
  }

  &__text {
    font-size: $fs-meta;
    color: $ink-soft;
  }
}

@keyframes breath {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

// 尊重系统的「减弱动态效果」
@media (prefers-reduced-motion: reduce) {
  .presence__dot {
    animation: none;
    opacity: 0.8;
  }
}
</style>
