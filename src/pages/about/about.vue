<script setup lang="ts">
import { computed, ref } from 'vue'

const feedback = ref('')
const submitted = ref(false)

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
    <text class="about__p">
      只使用微信提供的匿名标识来区分设备，不需要你授权任何东西。为了在地图上显示各地有多少人在小憩，会根据网络地址推断你所在的省份——只到省，不记录城市和更具体的位置，也不会和你的身份关联。不获取手机号、通讯录、头像和昵称。你写的反馈只用来改进产品。
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
    border-radius: $radius-button;

    &--off {
      background-color: $moss-soft;
    }
  }

  &__submit-text {
    font-size: $fs-meta;
    color: $paper;
  }
}
</style>
