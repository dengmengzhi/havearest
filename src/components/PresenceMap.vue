<script setup lang="ts">
import { computed } from 'vue'
import { MAP_CELLS, MAP_COLS, MAP_ROWS } from '@/assets/map/grid'
import provinceCoords from '@/assets/map/provinces.json'

interface ProvincePresence {
  province: string
  count: number
}

const props = defineProps<{ provinces: ProvincePresence[] }>()

const COORDS = provinceCoords as Record<string, { x: number, y: number }>

/** 闪烁错开的步长。同时亮灭会像警报，错开才像各地陆续有人。 */
const STAGGER_MS = 420

/**
 * 尺寸与位置**一律用 rpx，不用百分比**。
 *
 * 踩过的坑：格子用百分比宽高时，小程序端 281 个格子一个都不显示，
 * 而固定 rpx 尺寸的光点正常 —— 百分比算出来是 `3.5714285714285716%`
 * 这种超长小数，加上要依赖父容器的尺寸计算，链路太长。
 * 改成 rpx 后整条链路只剩常量运算，不依赖任何祖先元素的布局结果。
 *
 * 750rpx 的定义就是屏幕宽，所以 686 = 屏幕宽减去 .home 两侧各 32rpx 的内边距。
 * **.home 的左右 padding 改了，这里要跟着改。**
 */
const MAP_W_RPX = 686
const CELL_RPX = Math.round((MAP_W_RPX / MAP_COLS) * 100) / 100
const MAP_H_RPX = Math.round(CELL_RPX * MAP_ROWS * 100) / 100

/** 底图：中国轮廓离散成的格子。纯 view 节点，不经过图片解码。 */
const cells = computed(() =>
  MAP_CELLS.map(([c, r]) => ({
    key: `${c}-${r}`,
    left: `${Math.round(c * CELL_RPX * 100) / 100}rpx`,
    top: `${Math.round(r * CELL_RPX * 100) / 100}rpx`,
  })),
)

/**
 * 只渲染「有人在线」且「认识这个省份」的点。
 *
 * IP 归属地可能返回坐标表里没有的地方（境外出口、解析异常），
 * 那种情况直接不点亮，而不是画到地图外面去。
 */
const dots = computed(() =>
  props.provinces
    .filter(p => p.count > 0 && COORDS[p.province])
    .map((p, i) => ({
      province: p.province,
      // 同样换算成 rpx，理由见上
      x: `${Math.round(COORDS[p.province].x / 100 * MAP_W_RPX * 100) / 100}rpx`,
      y: `${Math.round(COORDS[p.province].y / 100 * MAP_H_RPX * 100) / 100}rpx`,
      // 按人数分三档而不是线性缩放：线性会让人最多的省份糊住半张图
      size: p.count >= 10 ? 'lg' : p.count >= 3 ? 'md' : 'sm',
      // 负延迟让动画一上来就处在各自的相位，不会先齐刷刷停一拍
      delay: `-${(i * STAGGER_MS) % 2400}ms`,
    })),
)
</script>

<template>
  <!-- 只有一层容器，格子与光点直接相对它定位。
       曾经在中间套过一层 absolute 的 __inner，多一层就多一处可能算错的布局 -->
  <view class="map">
    <!-- 轮廓由格子拼出来。不用 <image> 加载 SVG —— 小程序渲染不了那张图，
         文件路径、base64、两种 mode 都试过，一律白屏 -->
    <view
      v-for="cell in cells"
      :key="cell.key"
      class="map__cell"
      :style="{ left: cell.left, top: cell.top, width: `${CELL_RPX}rpx`, height: `${CELL_RPX}rpx` }"
    />

    <view
      v-for="d in dots"
      :key="d.province"
      class="map__dot"
      :class="`map__dot--${d.size}`"
      :style="{ left: d.x, top: d.y, animationDelay: d.delay }"
    >
      <!-- 外扩的光圈：像信号一样一圈圈荡开，比单纯改透明度更有「还亮着」的感觉 -->
      <view class="map__halo" :style="{ animationDelay: d.delay }" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.map {
  position: relative;
  // 宽高都写死，不用 width: 100% —— 它在 flex 容器里的解析结果依赖父级布局，
  // 而格子是按绝对 rpx 排的，两者对不上时整张图会偏出屏幕（真机上就这么翻车过）。
  // 686rpx = 屏幕宽 750 减去 .home 两侧各 32rpx 的内边距。
  // **.home 的左右 padding 改了，这里和 MAP_W_RPX 都要跟着改。**
  width: 686rpx;
  // 高度写死，不用 padding-top 百分比撑高。
  //
  // 小程序的 flex 布局下百分比 padding 撑不出高度 —— 实测现象是 281 个格子
  // （百分比尺寸）一个都不可见，而光点（固定 rpx 尺寸）正常显示，
  // 典型的「容器高度为 0，绝对定位子元素照样溢出画得出来」。
  //
  // 686rpx = 屏幕宽 750rpx 减去 .home 两侧各 32rpx 的内边距；
  // 490 = 686 × 20/28（网格行列比）。**.home 的左右 padding 改了这里要跟着改。**
  height: 490rpx; // = CELL_RPX × MAP_ROWS，与脚本生成的网格保持一致

  // 每格留一点缝隙，点阵感来自缝隙而不是描边
  &__cell {
    position: absolute;
    background-color: $map-cell;
    border-radius: 2rpx;
    transform: scale(0.72);
  }

  &__dot {
    position: absolute;
    background-color: $moss;
    border-radius: 50%;
    // 让圆心落在省份坐标上，而不是左上角
    transform: translate(-50%, -50%);
    animation: dot-pulse 2400ms ease-in-out infinite;

    &--sm {
      width: 12rpx;
      height: 12rpx;
    }

    &--md {
      width: 17rpx;
      height: 17rpx;
    }

    &--lg {
      width: 22rpx;
      height: 22rpx;
    }
  }

  // 光圈从点上荡开再淡出。用 box-shadow 而不是放大自身，
  // 免得把定位用的 translate(-50%,-50%) 一起缩放掉
  &__halo {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: 50%;
    animation: halo-spread 2400ms ease-out infinite;
  }
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  45% {
    opacity: 1;
  }
}

@keyframes halo-spread {
  0% {
    box-shadow: 0 0 0 0 rgba(79, 97, 84, 0.42);
  }

  70% {
    box-shadow: 0 0 0 16rpx rgba(79, 97, 84, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(79, 97, 84, 0);
  }
}

// 尊重系统的「减弱动态效果」
@media (prefers-reduced-motion: reduce) {
  .map__dot,
  .map__halo {
    animation: none;
  }

  .map__dot {
    opacity: 0.9;
  }
}
</style>
