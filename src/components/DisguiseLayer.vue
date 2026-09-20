<script setup lang="ts">
defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <!--
    用 v-show 而不是 v-if：v-if 会销毁重建，导致首页卡片位置丢失。
    PRD F5 要求返回后卡片与倒计时与切换前完全一致。
    计时由 store 持有，本层显示期间计时照常继续。

    本组件内不得出现产品名，也不得出现任何与本产品相关的字样（R2）。
    具体禁用词表见 scripts/check-forbidden.mjs，提交前由该脚本强制校验。
  -->
  <view v-show="visible" class="dg">
    <view class="dg__head">
      <text class="dg__title">
        项目周报
      </text>
      <text class="dg__back" @tap="emit('close')">
        ✕
      </text>
    </view>

    <text class="dg__meta">
      2026 年第 38 周 · 更新于 09-18 17:24
    </text>

    <text class="dg__h2">
      一、本周进展
    </text>
    <text class="dg__p">
      完成接口联调与二轮回归，遗留问题已在跟踪表中登记。数据导出模块按计划切换到新的调度策略，上线后未出现异常波动。
    </text>
    <text class="dg__p">
      与上下游确认了字段口径，相关说明已同步至共享文档，后续以该版本为准。
    </text>

    <text class="dg__h2">
      二、下周计划
    </text>
    <view class="dg__table">
      <view class="dg__row dg__row--head">
        <text class="dg__cell dg__cell--wide">事项</text>
        <text class="dg__cell">负责人</text>
        <text class="dg__cell">状态</text>
      </view>
      <view class="dg__row">
        <text class="dg__cell dg__cell--wide">存量数据清洗</text>
        <text class="dg__cell">待分配</text>
        <text class="dg__cell">进行中</text>
      </view>
      <view class="dg__row">
        <text class="dg__cell dg__cell--wide">报表口径复核</text>
        <text class="dg__cell">待分配</text>
        <text class="dg__cell">未开始</text>
      </view>
      <view class="dg__row">
        <text class="dg__cell dg__cell--wide">权限梳理与回收</text>
        <text class="dg__cell">待分配</text>
        <text class="dg__cell">未开始</text>
      </view>
    </view>

    <text class="dg__h2">
      三、风险与需要的支持
    </text>
    <text class="dg__p">
      排期依赖上游接口的交付时间，若本周内未确认，二期的联调窗口需要相应顺延。建议在周会上明确责任方。
    </text>
  </view>
</template>

<style scoped lang="scss">
.dg {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  padding: $sp-6 $sp-4 $sp-5;
  overflow-y: auto;
  background-color: $dg-bg;
  color: $dg-text;
  font-size: $dg-fs-body;
  line-height: $dg-lh;
  animation: dg-in $dur-disguise $ease-out;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: $dg-fs-h1;
    font-weight: 600;
    color: $dg-heading;
  }

  &__back {
    padding: $sp-1 $sp-2;
    font-size: $dg-fs-body;
    color: $dg-muted;
  }

  &__meta {
    display: block;
    margin-top: $sp-1;
    font-size: $dg-fs-meta;
    color: $dg-muted;
  }

  &__h2 {
    display: block;
    margin-top: $sp-5;
    margin-bottom: $sp-2;
    font-size: $dg-fs-h2;
    font-weight: 600;
    color: $dg-heading;
  }

  &__p {
    display: block;
    margin-bottom: $sp-2;
  }

  &__table {
    margin-top: $sp-2;
    border: 1rpx solid $dg-line;
  }

  &__row {
    display: flex;
    border-bottom: 1rpx solid $dg-line;

    &:last-child {
      border-bottom: none;
    }

    &--head {
      background-color: $dg-th-bg;
    }
  }

  &__cell {
    flex: 1;
    padding: $sp-2;
    font-size: $dg-fs-meta;
    border-right: 1rpx solid $dg-line;

    &:last-child {
      border-right: none;
    }

    &--wide {
      flex: 2;
    }
  }
}

@keyframes dg-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
