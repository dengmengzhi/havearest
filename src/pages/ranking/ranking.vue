<script setup lang="ts">
import type { RankingEntry } from '@/cloud/types'
import { onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'
import { usePresenceStore } from '@/stores/presence'
import { useRankingStore } from '@/stores/ranking'
import { formatTotal } from '@/utils/tally'

const ranking = useRankingStore()
// 首页已经拉过在线数，这里直接读 store 里的今日人次，不再多发一次请求
const presence = usePresenceStore()

onShow(() => {
  void ranking.load()
})

/** 我是否已经在榜单里出现过。是的话底部不再重复一张卡片。 */
const mineInList = computed(() =>
  ranking.mine !== null && ranking.entries.some(e => e.mine),
)

/** 前三名给一点区别。不用奖牌 emoji —— 那是另一套视觉语言，和这里不搭 */
function isTop(entry: RankingEntry): boolean {
  return entry.rank <= 3
}

/** 省份解析不出来时不留空白：显示「某处」，读起来仍是一个人。 */
function placeOf(entry: RankingEntry): string {
  return entry.province || '某处'
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}
</script>

<template>
  <view class="rank">
    <view class="rank__top">
      <text class="rank__back" @tap="goBack">
        ←
      </text>
    </view>

    <text class="rank__title">
      歇得最久的
    </text>
    <text class="rank__sub">
      按累计小憩时长排。只显示省份，没有名字和头像。
    </text>
    <text v-if="presence.todayCount > 0" class="rank__sub">
      今天有 {{ presence.todayCount }} 个人在这儿歇过。
    </text>

    <scroll-view class="rank__scroll" scroll-y>
      <view
        v-for="entry in ranking.entries"
        :key="`${entry.rank}-${entry.province}-${entry.seconds}`"
        class="rank__row"
        :class="{ 'rank__row--mine': entry.mine }"
      >
        <text class="rank__no" :class="{ 'rank__no--top': isTop(entry) }">
          {{ entry.rank }}
        </text>
        <view class="rank__who">
          <text class="rank__place">
            {{ entry.mine ? `${placeOf(entry)} · 你` : placeOf(entry) }}
          </text>
          <text class="rank__times">
            {{ entry.sessions }} 次
          </text>
        </view>
        <text class="rank__dur">
          {{ formatTotal(entry.seconds) }}
        </text>
      </view>

      <!-- 拉到过一次才敢说「还没有人」。没拉到就是没拉到，不是榜是空的 -->
      <text v-if="ranking.loaded && !ranking.entries.length" class="rank__empty">
        还没有人上榜。歇一次就有了。
      </text>
      <text v-else-if="ranking.failed" class="rank__empty">
        榜单没拉到，待会儿再看看
      </text>
    </scroll-view>

    <!-- 没进榜时单独把自己的名次放在底部，不用在榜单里翻 -->
    <view v-if="ranking.mine && !mineInList" class="rank__self">
      <text class="rank__no rank__no--self">
        {{ ranking.mine.rank }}
      </text>
      <view class="rank__who">
        <text class="rank__place rank__place--self">
          {{ placeOf(ranking.mine) }} · 你
        </text>
        <text class="rank__times">
          {{ ranking.mine.sessions }} 次
        </text>
      </view>
      <text class="rank__dur rank__dur--self">
        {{ formatTotal(ranking.mine.seconds) }}
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.rank {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0 $sp-4;
  background-color: $paper;

  &__top {
    // 给自定义导航栏留出状态栏高度，和其余页面一致
    padding-top: 88rpx;
  }

  &__back {
    padding: $sp-2;
    font-size: $fs-option;
    color: $ink-soft;
  }

  &__title {
    margin-top: $sp-4;
    font-size: $fs-greeting;
    color: $ink;
  }

  &__sub {
    margin-top: $sp-1;
    font-size: $fs-micro;
    color: $ink-soft;
  }

  // flex: 1 + min-height: 0 让列表吃掉剩余高度，底部那张卡片始终贴着屏幕下沿
  &__scroll {
    flex: 1;
    min-height: 0;
    margin-top: $sp-4;
  }

  &__row {
    display: flex;
    align-items: center;
    height: 96rpx;
    // 细线分隔，不用卡片 —— 二十行卡片会很吵
    border-bottom: 1rpx solid $hairline;
  }

  &__row--mine {
    border-radius: $radius-card;
    background-color: $moss-soft;
    border-bottom-color: transparent;
  }

  &__no {
    width: 72rpx;
    font-size: $fs-option;
    font-weight: $fw-light;
    color: $ink-soft;
    text-align: center;
  }

  // 前三名只是换个颜色加个字重，不放奖牌
  &__no--top {
    color: $moss;
    font-weight: $fw-normal;
  }

  &__no--self {
    color: $moss;
  }

  &__who {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding-left: $sp-2;
  }

  &__place {
    font-size: $fs-body;
    color: $ink;
  }

  &__place--self {
    color: $moss;
  }

  &__times {
    margin-top: 4rpx;
    font-size: $fs-micro;
    color: $ink-soft;
  }

  &__dur {
    padding-right: $sp-2;
    font-size: $fs-option;
    color: $ink;
  }

  &__dur--self {
    color: $moss;
  }

  &__empty {
    display: block;
    padding: $sp-6 0;
    font-size: $fs-meta;
    color: $ink-soft;
    text-align: center;
  }

  // 自己那张卡片钉在底部，和列表之间隔一条线
  &__self {
    display: flex;
    align-items: center;
    height: 112rpx;
    margin-top: $sp-2;
    border-top: 1rpx solid $hairline;
    // 补安全区：iPhone 底部手势条会压住这一行
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>
