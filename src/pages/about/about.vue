<script setup lang="ts">
import { computed, ref } from 'vue'

const feedback = ref('')
const submitted = ref(false)

/** 这份清单要和实际行为一致 —— 写了不获取就真的不能获取（R6 由 ESLint 拦着）。 */
const NOT_COLLECTED = ['手机号', '位置', '通讯录', '头像和昵称', '微信好友关系']

/**
 * 实际会落库的东西，逐项说明用途。
 *
 * 「使用记录」这条早先漏写了 —— events 集合确实在记录打开时间、计时时长这些，
 * 声明里不提就是不完整。
 */
const COLLECTED = [
  { name: '微信给的匿名标识', why: '用来区分设备。它是一串随机字符，反推不到你是谁' },
  { name: '网络地址推断的省份', why: '用来在地图上显示各地有多少人。只到省，不记录城市' },
  { name: '使用记录', why: '什么时候来、歇了多久。用来判断这个产品是否真的有用' },
  { name: '你写的反馈', why: '只用来改进产品' },
]

const canSubmit = computed(() => feedback.value.trim().length > 0)

function submit() {
  if (!canSubmit.value)
    return
  // TODO(下一轮): 写入 feedback 集合；埋点 feedback_submit（length）
  submitted.value = true
  feedback.value = ''
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}
</script>

<template>
  <view class="about">
    <view class="about__top">
      <text class="about__icon" @tap="goBack">
        ←
      </text>
    </view>

    <text class="about__title">
      小憩一下
    </text>
    <text class="about__p">
      工作间隙歇几分钟的地方。选一个时长，到点了它会提醒你回去。没有声音，没有振动，没有红点。
    </text>

    <text class="about__h2">
      说点什么
    </text>
    <textarea
      v-model="feedback"
      class="about__input"
      placeholder="哪里不好用，或者想看到什么"
      :maxlength="500"
      placeholder-class="about__placeholder"
    />
    <view class="about__submit" :class="{ 'about__submit--off': !canSubmit }" @tap="submit">
      <text class="about__submit-text">
        {{ submitted ? '收到了' : '提交' }}
      </text>
    </view>

    <text class="about__h2">
      隐私
    </text>

    <!-- 拆成对照结构而不是一段话：「不获取」的清单比「会用到」的更长，
         排版本身就在说明我们要的东西有多少。一段密集文字没人读得下去，
         而隐私恰恰是最需要被读进去的 -->
    <view class="about__group">
      <text class="about__group-title">
        不获取
      </text>
      <text v-for="item in NOT_COLLECTED" :key="item" class="about__item">
        {{ item }}
      </text>
    </view>

    <view class="about__group">
      <text class="about__group-title">
        会用到
      </text>
      <view v-for="item in COLLECTED" :key="item.name" class="about__entry">
        <text class="about__item">
          {{ item.name }}
        </text>
        <text class="about__why">
          {{ item.why }}
        </text>
      </view>
    </view>

    <text class="about__p">
      全程不需要你授权任何东西。
    </text>
  </view>
</template>

<style scoped lang="scss">
.about {
  min-height: 100vh;
  padding: 88rpx $sp-4 $sp-6;
  background-color: $paper;

  &__top {
    display: flex;
    align-items: center;
  }

  &__icon {
    padding: $sp-2 $sp-2 $sp-2 0;
    font-size: $fs-option;
    color: $ink-soft;
  }

  &__title {
    display: block;
    margin-top: $sp-3;
    font-size: $fs-greeting;
    color: $ink;
  }

  &__h2 {
    display: block;
    margin-top: $sp-5;
    margin-bottom: $sp-2;
    font-size: $fs-option;
    color: $ink;
  }

  &__p {
    display: block;
    margin-top: $sp-2;
    font-size: $fs-meta;
    line-height: $lh-loose;
    color: $ink-soft;
  }

  &__group {
    display: flex;
    flex-direction: column;
    margin-top: $sp-3;
  }

  // 分组标题比条目淡一档，但必须看得清 —— 它承载的是「这两组是对照关系」，
  // 弱到看不见就等于把结构信息丢了
  &__group-title {
    margin-bottom: $sp-2;
    font-size: $fs-micro;
    color: $ink-soft;
  }

  &__entry {
    display: flex;
    flex-direction: column;
    margin-bottom: $sp-2;
  }

  &__item {
    font-size: $fs-meta;
    line-height: 1.7;
    color: $ink;
  }

  // 用途说明缩进一格，读起来是「这一项 → 为什么要」
  &__why {
    padding-left: $sp-2;
    font-size: $fs-micro;
    line-height: $lh-normal;
    color: $ink-soft;
  }

  &__input {
    width: 100%;
    height: 200rpx;
    padding: $sp-3;
    font-size: $fs-meta;
    line-height: $lh-normal;
    color: $ink;
    background-color: $card;
    border: 1rpx solid $hairline;
    border-radius: $radius-card;
  }

  &__placeholder {
    color: $ink-faint;
  }

  &__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: $sp-3;
    padding: $sp-2 0;
    background-color: $moss;
    border: 1rpx solid $moss;
    border-radius: $radius-button;

    // 还没写字时用描边而不是浅色实底：实底会让人分不清是「不能点」还是「坏了」，
    // 空心明确表示「按钮在这儿，但还差点什么」
    &--off {
      background-color: transparent;
      border-color: $hairline;
    }
  }

  &__submit-text {
    font-size: $fs-meta;
    color: $paper;
  }

  &__submit--off &__submit-text {
    color: $ink-faint;
  }
}
</style>
