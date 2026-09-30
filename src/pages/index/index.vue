<script setup lang="ts">
import type { DurationMinutes } from '@/types'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { computed, onUnmounted, ref, watch } from 'vue'
import provinceCoords from '@/assets/map/provinces.json'
import DisguiseLayer from '@/components/DisguiseLayer.vue'
import GreetingLine from '@/components/GreetingLine.vue'
import PresenceDot from '@/components/PresenceDot.vue'
import PresenceMap from '@/components/PresenceMap.vue'
import TimerBar from '@/components/TimerBar.vue'
import { CARD, HAIRLINE, INK, MOSS } from '@/constants/colors'
import { useGreetingStore } from '@/stores/greeting'
import { usePresenceStore } from '@/stores/presence'
import { useTimerStore } from '@/stores/timer'
import { useUserStore } from '@/stores/user'

const greeting = useGreetingStore()
const presence = usePresenceStore()
const timer = useTimerStore()
const user = useUserStore()

const disguised = ref(false)

/**
 * 地图视野。
 *
 * 不用固定 scale：不同机型屏幕比例差很多，同一个 scale 在长屏上会把中国压扁、
 * 在宽屏上又露出大半个东南亚。改用 include-points 传中国的四至点，
 * 让地图自己缩放到刚好包住。
 *
 * ⚠️ 真实地图**没有**只画一个国家的能力 —— 腾讯地图的底图是整个世界，
 * 没有按国界裁切的接口。能做的是让中国尽量填满画面：把容器做成和中国
 * 外接框一样的比例（见 &__map 的尺寸），多出来的周边就只剩边角。
 * 在此之前容器是竖的、中国是横的，于是上下各空出一大片海和东南亚。
 */
const CHINA_BOUNDS = [
  { longitude: 73.5, latitude: 39.5 }, // 西：新疆帕米尔
  { longitude: 135.0, latitude: 48.5 }, // 东：黑龙江抚远
  { longitude: 110.0, latitude: 18.2 }, // 南：海南
  { longitude: 123.5, latitude: 53.5 }, // 北：漠河
]

/** include-points 生效前的初始视野，避免第一帧闪一下世界地图。 */
const CHINA_CENTER = { longitude: 104.0, latitude: 35.5 }
const CHINA_SCALE = 4

/** PRD F1：到点提示停留 2 秒再跳转。 */
const NOTIFY_HOLD_MS = 2000

/**
 * 首屏内容只拉一次。
 *
 * onShow 在每次页面显示时都会触发，包括从结束页 navigateBack 回来 ——
 * 那时如果重新 pick，「再歇一会儿」就会换掉问候语。
 */
let contentLoaded = false
let notifyTimer: ReturnType<typeof setTimeout> | null = null

onShow(() => {
  if (!contentLoaded) {
    contentLoaded = true
    // 头像先定下来再拉内容：它只读本地、是同步的，不该等网络
    user.resolveAvatar()
    void greeting.pick()
  }
  // 心跳只在前台发送，否则在线数会虚高（PRD F4）
  presence.startHeartbeat()
})

// 到点：提示行浮出 2 秒后进入结束页。无声音、无振动、不弹窗（R3）
watch(() => timer.status, (status) => {
  // 任何离开 notifying 的迁移都要撤销待跳转：提示的这 2 秒里用户可能手动结束，
  // 或者直接选了新时长重新开始，这时再跳结束页就是错的
  if (status !== 'notifying') {
    clearNotifyTimer()
    return
  }
  notifyTimer = setTimeout(() => {
    timer.finish('timeout')
    uni.navigateTo({ url: '/pages/done/done' })
  }, NOTIFY_HOLD_MS)
})

function clearNotifyTimer() {
  if (notifyTimer) {
    clearTimeout(notifyTimer)
    notifyTimer = null
  }
}

onUnload(() => {
  clearNotifyTimer()
  timer.stopTick()
})

onUnmounted(() => {
  clearNotifyTimer()
  presence.stopHeartbeat()
  timer.stopTick()
})

function onSelectDuration(minutes: DurationMinutes) {
  timer.start(minutes)
}

function onStop() {
  clearNotifyTimer()
  // 提示期间点「结束」只是提前跳转，本次小憩其实是走完了的，
  // reason 仍记 timeout，否则埋点里的 timeout/manual 分布会失真
  timer.finish(timer.status === 'notifying' ? 'timeout' : 'manual')
  uni.navigateTo({ url: '/pages/done/done' })
}

function openDisguise() {
  disguised.value = true
  // TODO(下一轮): 埋点 disguise_on（from_timer_seconds）
}

const COORDS = provinceCoords as Record<string, { x: number, y: number }>

/** 与 provinces.json 生成时的投影一致，这里把百分比反算回经纬度给 marker 用。 */
const LON0 = 73.0
const LON1 = 135.0
const LAT0 = 18.0
const LAT1 = 54.0

/**
 * 1×1 全透明图，用来把 marker 的默认红色气泡藏掉。
 * iconPath 必须给图片、给不了空值，所以用一张看不见的图占位，
 * 只留 callout 那个文字块 —— 红气泡和「配色低饱和」是正面冲突的。
 */
const BLANK_PIN = '/static/map/pin-blank.png'

const markers = computed(() =>
  presence.provinces
    .filter(p => p.count > 0 && COORDS[p.province])
    .map((p, i) => {
      const mine = p.province === presence.myProvince
      return {
        id: i,
        longitude: LON0 + (COORDS[p.province].x / 100) * (LON1 - LON0),
        latitude: LAT1 - (COORDS[p.province].y / 100) * (LAT1 - LAT0),
        iconPath: BLANK_PIN,
        width: 1,
        height: 1,
        callout: {
          // 自己所在的省单独标出来 —— 在一堆数字里找不到自己，
          // 「各地都有人」的陪伴感就落不到自己身上
          content: mine ? `你在这里 · ${p.count}` : `${p.province} ${p.count}`,
          color: mine ? CARD : INK,
          fontSize: mine ? 12 : 11,
          borderRadius: 4,
          bgColor: mine ? MOSS : CARD,
          padding: mine ? 6 : 5,
          // 细边框代替阴影，和卡片、按钮用同一套处理
          borderWidth: 1,
          borderColor: mine ? MOSS : HAIRLINE,
          textAlign: 'center' as const,
          display: 'ALWAYS' as const,
        },
      }
    }),
)

function openAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}

function openRanking() {
  uni.navigateTo({ url: '/pages/ranking/ranking' })
}
</script>

<template>
  <view class="home">
    <view class="home__top">
      <!-- 左上角是分配到的那条鱼，兼作关于页入口；右上角是伪装层 -->
      <image
        class="home__avatar"
        :src="user.avatar.src"
        mode="aspectFit"
        :alt="user.avatar.name"
        @tap="openAbout"
      />
      <text class="home__icon" @tap="openDisguise">
        ▤
      </text>
    </view>

    <view class="home__head">
      <GreetingLine :text="greeting.text" />
      <!-- 在线人数与排行榜入口同一行：入口跟着人数走，比单独摆一个按钮自然 -->
      <view class="home__presence">
        <PresenceDot :text="presence.label.text" />
        <text class="home__rank-entry" @tap="openRanking">
          排行榜 ›
        </text>
      </view>
    </view>

    <!-- 中间：全国分布图，点亮此刻有人在小憩的省份 -->
    <view class="home__stage">
      <text v-if="timer.status === 'notifying'" class="home__notify">
        该回去了，今天歇得刚刚好
      </text>
      <!--
        disguised 时把地图整个从 DOM 移除，而不只是隐藏。
        map 是原生组件，同层渲染是「可能失败」的优化而非保证 —— 一旦失效，
        原生组件层级最高、任何 z-index 都盖不住它，伪装层就被戳穿了（F5 的命门）。
        直接不渲染最保险，代价只是返回时地图重新初始化一下。
      -->
      <template v-else-if="!disguised">
        <!-- 小程序端用腾讯地图，基础显示免费、不需要 key -->
        <!-- #ifdef MP-WEIXIN -->
        <map
          class="home__map"
          :longitude="CHINA_CENTER.longitude"
          :latitude="CHINA_CENTER.latitude"
          :scale="CHINA_SCALE"
          :include-points="CHINA_BOUNDS"
          :markers="markers"
          :show-location="false"
          :enable-3D="false"
          :show-compass="false"
          :enable-overlooking="false"
          :enable-zoom="false"
          :enable-scroll="false"
        />
        <!-- #endif -->

        <!--
          H5 端的 map 要在 manifest 里配地图服务 key，我们没有，
          所以那边继续用点阵图 —— 开发时还能看到分布，不至于对着空框调布局
        -->
        <!-- #ifndef MP-WEIXIN -->
        <PresenceMap :provinces="presence.provinces" />
        <!-- #endif -->
      </template>
    </view>

    <view class="home__action">
      <TimerBar
        :is-running="timer.status === 'running' || timer.status === 'notifying'"
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

  // 尺寸和右上角的伪装图标看齐，保持克制
  &__avatar {
    width: $avatar-size;
    height: $avatar-size;
  }

  &__head {
    margin-top: $sp-4;
  }

  &__presence {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  // 入口保持克制：一行小字加个角标，不做成按钮
  &__rank-entry {
    padding: $sp-1 $sp-2;
    font-size: $fs-meta;
    color: $ink-soft;
  }

  // 尺寸写死 rpx 的理由同 PresenceMap：width: 100% 在 flex 容器里的解析
  // 依赖父级布局，真机上翻过车。
  //
  // 686 : 505 ≈ 1.36，正是中国外接框在墨卡托投影下的宽高比
  // （经度跨 73.5°~135°，纬度跨 18.2°~53.5°）。容器比例贴着内容比例，
  // include-points 缩放后周边露出得最少 —— 这是「只看中国」能做到的极限。
  &__map {
    width: 686rpx;
    height: 505rpx;
    // 原生组件在 flex 列里会被压缩，高度必须钉死
    flex-shrink: 0;
    border-radius: $radius-card;
  }

  // 中间区：地图 + 榜单纵向排。flex: 1 吃掉剩余空间，把控制条顶到底部
  // （R5：主按钮必须落在屏幕下 40% 区域）
  &__stage {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: $sp-4 0;
  }

  // 中间现在只剩它，字号比原先在卡片上方时大一档
  &__notify {
    font-size: $fs-greeting;
    color: $moss;
    text-align: center;
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
