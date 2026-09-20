<script setup lang="ts">
import type { CardCategory, NapCard } from '@/types'

defineProps<{ card: NapCard }>()

/** 分类标签的中文，与 PRD 内容需求的四类对应。 */
const CATEGORY_LABEL: Record<CardCategory, string> = {
  joke: '冷笑话',
  workplace: '职场吐槽',
  trivia: '冷知识',
  healing: '一句话治愈',
}
</script>

<template>
  <view class="card">
    <image
      v-if="card.type === 'image' && card.imageUrl"
      class="card__image"
      :src="card.imageUrl"
      mode="aspectFill"
    />
    <!-- 文案在纸中央而不是贴顶：短句占不满一屏卡时，靠顶会显得像还没加载完 -->
    <view class="card__body">
      <text class="card__text">
        {{ card.text }}
      </text>
    </view>
    <!-- 分类是卡片底部一行小字，不是 pill badge -->
    <text class="card__category">
      {{ CATEGORY_LABEL[card.category] }}
    </text>
  </view>
</template>

<style scoped lang="scss">
.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: $sp-5 $sp-4 $sp-4;
  background-color: $card;
  // 纸的切角，不是 SaaS 默认圆角；无阴影，只有一条低对比边线
  border: 1rpx solid $hairline;
  border-radius: $radius-card;

  &__image {
    width: 100%;
    // 图文卡统一竖版 3:4（PRD 内容需求）
    aspect-ratio: 3 / 4;
    margin-bottom: $sp-3;
    border-radius: $radius-card;
  }

  &__body {
    display: flex;
    flex: 1;
    align-items: center;
    min-height: 0;
  }

  &__text {
    font-size: $fs-body;
    line-height: $lh-loose;
    color: $ink;
  }

  &__category {
    margin-top: $sp-3;
    font-size: $fs-meta;
    color: $ink-soft;
  }
}
</style>
