<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <!--
    容器无条件渲染、高度钉死：第一次拉到人数之前 text 是空的，
    如果整块不占位，数字到达时下面的地图会往下跳一格
  -->
  <view class="presence">
    <template v-if="text">
      <!-- 全站唯一的非用户触发动效：4 秒一次的极慢呼吸，
           是「有人陪」的唯一视觉证据。其余一切保持安静。 -->
      <view class="presence__dot" />
      <text class="presence__text">
        {{ text }}
      </text>
    </template>
  </view>
</template>

<style scoped lang="scss">
.presence {
  display: flex;
  align-items: center;
  height: 40rpx;
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
