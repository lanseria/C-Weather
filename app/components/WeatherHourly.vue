<script setup lang="ts">
import { useElementSize, useScroll } from '@vueuse/core'
import { format, getHours, isSameHour, parseISO } from 'date-fns'
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
// 假设这些工具函数已存在
const { getWeatherIcon, getAQIDescription, getWeatherName, getWindLevel, formatWindSpeed, formatTemperature } = useWeatherUtils()

const hourOf = (time: string) => getHours(parseISO(time))

// --- 常量配置 ---
const COLUMN_WIDTH = 36
const CHART_HEIGHT = 260 // 增加高度以容纳更多细节
const CONTENT_HEIGHT = 70 // 底部预留给图标和文字的高度
const TOP_PADDING = 80 // 顶部预留高度 (增加到 80px 给 Tooltip 腾出空间)
const LABEL_WIDTH = 48
const DOT_RADIUS = 9 // 指示器圆点（含边框）半径，用于上下连接线的对齐

// --- 容器引用 ---
const containerRef = ref<HTMLElement | null>(null)
const { x: scrollLeft } = useScroll(containerRef)
const { width: containerWidth } = useElementSize(containerRef) // 获取容器实时宽度

// --- Web 端滚轮横向滚动 ---
onMounted(() => {
  const container = containerRef.value
  if (!container)
    return

  const handleWheel = (event: WheelEvent) => {
    // 仅在垂直滚动幅度大于水平滚动时才接管
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault()
      container.scrollLeft += event.deltaY
    }
  }

  container.addEventListener('wheel', handleWheel, { passive: false })

  onUnmounted(() => {
    container.removeEventListener('wheel', handleWheel)
  })
})

// --- 数据处理 ---
const hourlyData = computed(() => {
  const data = weatherStore.weatherData?.hourly
  if (!data)
    return []

  const startIndex = data.time.findIndex(t => isSameHour(parseISO(t), new Date()))

  if (startIndex === -1)
    return []

  return data.time.slice(startIndex).map((time, i) => {
    const index = startIndex + i
    const yesterdayTemp = data.temperature_2m[index - 24]
    const tempDiff = yesterdayTemp !== undefined ? data.temperature_2m[index]! - yesterdayTemp : null

    return {
      time,
      temp: data.temperature_2m[index]!,
      code: data.weather_code[index]!,
      windSpeed: data.wind_speed_10m[index]!,
      windDir: data.wind_direction_10m[index]!,
      aqi: data.us_aqi ? data.us_aqi[index]! : 0,
      tempDiff,
    }
  })
})

const totalContentWidth = computed(() => hourlyData.value.length * COLUMN_WIDTH)

// --- 分组逻辑 ---
interface GroupedItem<T> { id: string, count: number, data: T }
function groupData<T>(list: T[], compareFn: (a: T, b: T) => boolean): GroupedItem<T>[] {
  if (!list.length)
    return []
  const groups: GroupedItem<T>[] = []
  let currentGroup: GroupedItem<T> = { id: `g-0`, count: 1, data: list[0]! }

  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1]!
    const curr = list[i]!
    if (compareFn(prev, curr) && currentGroup.count < 4) {
      currentGroup.count++
    }
    else {
      groups.push(currentGroup)
      currentGroup = { id: `g-${i}`, count: 1, data: curr }
    }
  }
  groups.push(currentGroup)
  return groups
}

const weatherGroups = computed(() => groupData(hourlyData.value, (a, b) => a.code === b.code))
const windGroups = computed(() => groupData(hourlyData.value, (a, b) => getWindLevel(a.windSpeed) === getWindLevel(b.windSpeed)))

// 背景样式处理...
function getWeatherBackgroundClass(code: number) {
  const base = 'bg-gradient-to-t from-transparent'
  if ([0, 1].includes(code))
    return `${base} via-orange-100/70 to-orange-50/30 dark:via-orange-400/20 dark:to-orange-400/5`
  if (code === 2)
    return `${base} via-sky-100/70 to-sky-50/30 dark:via-sky-400/20 dark:to-sky-400/5`
  if ([3, 45, 48].includes(code))
    return `${base} via-gray-200/70 to-gray-100/30 dark:via-gray-600/20 dark:to-gray-600/5`
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return 'weather-bg-rain'
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return `${base} via-cyan-100/70 to-cyan-50/30 dark:via-cyan-400/20 dark:to-cyan-400/5`
  if ([95, 96, 99].includes(code))
    return `${base} via-purple-100/70 to-purple-50/30 dark:via-purple-400/20 dark:to-purple-400/5`
  return ''
}

// --- 图表绘制逻辑：单调三次插值 (Fritsch–Carlson) ---
// 切线在各数据点处连续，且不会在峰谷附近过冲；
// 实线/虚线都比固定平滑系数的样条更顺滑，也更符合温度连续变化的直觉
// 斜率单位统一为“每列的 y 像素变化”，与等间距列宽配合
function buildMonotoneSlopes(ys: number[]) {
  const n = ys.length
  const slopes = Array.from<number>({ length: n }).fill(0)
  if (n < 2)
    return slopes

  const deltas = Array.from({ length: n - 1 }, (_, i) => ys[i + 1]! - ys[i]!)

  for (let i = 1; i < n - 1; i++) {
    // 局部极值处切线归零，曲线平滑绕过峰谷而不是冲过再折返
    slopes[i] = deltas[i - 1]! * deltas[i]! <= 0 ? 0 : (deltas[i - 1]! + deltas[i]!) / 2
  }

  // Fritsch–Carlson 约束：限制切线模长，保证每一段曲线都单调
  for (let i = 0; i < n - 1; i++) {
    if (deltas[i]! === 0) {
      slopes[i] = 0
      slopes[i + 1] = 0
      continue
    }
    const a = slopes[i]! / deltas[i]!
    const b = slopes[i + 1]! / deltas[i]!
    const norm = Math.hypot(a, b)
    if (norm > 3) {
      slopes[i] = (3 * a * deltas[i]!) / norm
      slopes[i + 1] = (3 * b * deltas[i]!) / norm
    }
  }
  return slopes
}

// Hermite 样条转三次贝塞尔路径；offset 为首个数据点所在列（昨日数据可能缺前几列）
function splineToPath(offset: number, ys: number[], slopes: number[]) {
  if (!ys.length)
    return ''
  const xOf = (i: number) => (offset + i) * COLUMN_WIDTH + COLUMN_WIDTH / 2
  let path = `M 0,${ys[0]!} L ${xOf(0)},${ys[0]!}`
  for (let i = 0; i < ys.length - 1; i++) {
    const x = xOf(i)
    const nx = xOf(i + 1)
    path += ` C ${x + COLUMN_WIDTH / 3},${ys[i]! + slopes[i]! / 3} ${nx - COLUMN_WIDTH / 3},${ys[i + 1]! - slopes[i + 1]! / 3} ${nx},${ys[i + 1]!}`
  }
  return `${path} L ${totalContentWidth.value},${ys.at(-1)!}`
}

// 按内容区 x 坐标在样条上连续取样，让指示器圆点滚动时始终贴合曲线
function sampleSplineY(ys: number[], slopes: number[], x: number) {
  if (!ys.length)
    return 0
  const t = (x - COLUMN_WIDTH / 2) / COLUMN_WIDTH
  if (t <= 0)
    return ys[0]!
  if (t >= ys.length - 1)
    return ys.at(-1)!
  const i = Math.floor(t)
  const f = t - i
  const f2 = f * f
  const f3 = f2 * f
  return (
    (2 * f3 - 3 * f2 + 1) * ys[i]!
    + (f3 - 2 * f2 + f) * slopes[i]!
    + (-2 * f3 + 3 * f2) * ys[i + 1]!
    + (f3 - f2) * slopes[i + 1]!
  )
}

const chartData = computed(() => {
  const data = hourlyData.value
  const rawHourly = weatherStore.weatherData?.hourly
  if (!data.length || !rawHourly)
    return { linePath: '', areaPath: '', yesterdayLinePath: '', sampleY: null }

  const startIndex = rawHourly.time.findIndex(t => isSameHour(parseISO(t), parseISO(data[0]!.time)))
  const todayTemps = data.map(d => d.temp)
  const yesterdayTemps = data.map((_, i) => rawHourly.temperature_2m[startIndex + i - 24]).filter(t => t !== undefined) as number[]

  const allTemps = [...todayTemps, ...yesterdayTemps]
  const minTemp = Math.min(...allTemps)
  const maxTemp = Math.max(...allTemps)
  const range = maxTemp - minTemp || 1
  const availableHeight = CHART_HEIGHT - CONTENT_HEIGHT - TOP_PADDING

  const getPointY = (temp: number) => {
    const ratio = (temp - minTemp) / range
    return CHART_HEIGHT - CONTENT_HEIGHT - (ratio * availableHeight)
  }

  const todayYs = data.map(d => getPointY(d.temp))

  // 昨日温度缺少今天 0 点前的部分列，记录其起始列偏移
  let yesterdayOffset = 0
  const yesterdayYs: number[] = []
  for (let i = 0; i < data.length; i++) {
    const temp = rawHourly.temperature_2m[startIndex + i - 24]
    if (temp === undefined) {
      yesterdayOffset = i + 1
      continue
    }
    yesterdayYs.push(getPointY(temp))
  }

  const todaySlopes = buildMonotoneSlopes(todayYs)
  const yesterdaySlopes = buildMonotoneSlopes(yesterdayYs)
  // 首尾切线归零，与路径两端的水平延伸线平滑衔接
  for (const slopes of [todaySlopes, yesterdaySlopes]) {
    if (slopes.length > 1) {
      slopes[0] = 0
      slopes[slopes.length - 1] = 0
    }
  }

  const linePath = splineToPath(0, todayYs, todaySlopes)
  const yesterdayLinePath = splineToPath(yesterdayOffset, yesterdayYs, yesterdaySlopes)
  const areaPath = `${linePath} L ${totalContentWidth.value},${CHART_HEIGHT} L 0,${CHART_HEIGHT} Z`

  return {
    linePath,
    areaPath,
    yesterdayLinePath,
    sampleY: (x: number) => sampleSplineY(todayYs, todaySlopes, x),
  }
})

// --- 动态指示器位置与激活状态 ---
const indicatorX = computed(() => {
  // 如果没有宽度信息，默认居左
  if (!containerWidth.value || !totalContentWidth.value)
    return LABEL_WIDTH + (COLUMN_WIDTH / 2)

  // 计算最大滚动距离
  const maxScroll = totalContentWidth.value - containerWidth.value

  // 如果内容宽度小于容器宽度，默认居中或保持逻辑（这里保持居左逻辑直到内容溢出）
  if (maxScroll <= 0)
    return LABEL_WIDTH + (COLUMN_WIDTH / 2)

  // 计算当前滚动进度 (0 ~ 1)
  const progress = Math.min(Math.max(scrollLeft.value / maxScroll, 0), 1)

  // 指示器行程范围：
  // 起点: 左侧 label 后第 0.5 个 column 处
  // 终点: 容器最右侧减去 0.5 个 column 处
  // 可移动的总距离 = 容器宽度 - 1个列宽
  const travelDist = containerWidth.value - COLUMN_WIDTH
  const startX = LABEL_WIDTH + (COLUMN_WIDTH / 2)

  return startX + (progress * travelDist)
})

// 提示框在两端向内收，避免被指示器层的 overflow-hidden 裁切
const tooltipX = computed(() => {
  const overlayWidth = containerWidth.value + LABEL_WIDTH * 2
  if (!overlayWidth)
    return indicatorX.value
  const margin = 62 // 提示框 min-w-[100px] 的一半再加余量
  return Math.min(Math.max(indicatorX.value, margin), Math.max(margin, overlayWidth - margin))
})

const activeState = computed(() => {
  if (!hourlyData.value.length)
    return { index: 0, item: null, y: 0 }

  // 激活项由 scrollLeft（已滚动距离）与指示器在可视区域内的偏移共同决定。
  // 列中心位于 (i + 0.5) * COLUMN_WIDTH，先减去半列宽再四舍五入，
  // 使高亮切换恰好发生在指示器越过列中心的瞬间
  const indicatorOffsetInView = indicatorX.value - LABEL_WIDTH
  const absoluteX = scrollLeft.value + indicatorOffsetInView

  const index = Math.min(
    Math.max(Math.round((absoluteX - COLUMN_WIDTH / 2) / COLUMN_WIDTH), 0),
    hourlyData.value.length - 1,
  )

  // 圆点 y 直接在样条上按 absoluteX 连续取样，滚动时始终贴合曲线
  const y = chartData.value.sampleY ? chartData.value.sampleY(absoluteX) : 0

  return {
    index,
    item: hourlyData.value[index],
    y,
  }
})
</script>

<template>
  <div v-if="hourlyData.length" class="group mt-6 select-none relative">
    <div class="mb-4 px-1 flex items-center justify-between">
      <h3 class="text-lg font-semibold">
        逐小时预报
      </h3>
      <span class="text-xs text-gray-400">滑动查看趋势</span>
    </div>

    <div class="w-full relative">
      <div class="rounded-xl pointer-events-none inset-0 absolute z-30 overflow-hidden">
        <div
          v-if="activeState.item"
          class="pointer-events-none absolute z-40"
          :style="{
            left: `${tooltipX}px`,
            top: '10px',
            transform: 'translateX(-50%)',
          }"
        >
          <div class="px-3 py-2 text-center border border-gray-100 rounded-xl bg-white/90 min-w-[100px] shadow-lg backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/90">
            <!-- 第一行：日期 / 时间 / 天气 -->
            <div class="text-xs text-gray-500 mb-1 flex gap-1.5 whitespace-nowrap items-center justify-center dark:text-gray-400">
              <span>{{ format(parseISO(activeState.item.time), 'M/d') }}</span>
              <span>{{ format(parseISO(activeState.item.time), 'H') }}点</span>
              <span class="text-gray-700 font-medium dark:text-gray-200">{{ getWeatherName(activeState.item.code) }}</span>
            </div>

            <!-- 第二行：温度 / 对比 -->
            <div class="flex gap-2 items-center justify-center">
              <span class="text-2xl text-gray-800 leading-none tracking-tight font-bold dark:text-white">
                {{ formatTemperature(activeState.item.temp) }}
              </span>

              <!-- 对比徽章 -->
              <div
                v-if="activeState.item.tempDiff !== null"
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 flex items-center dark:bg-gray-700/50"
              >
                <span v-if="Math.abs(Math.round(activeState.item.tempDiff)) === 0" class="text-gray-400">
                  持平
                </span>
                <template v-else>
                  <div
                    class="i-carbon-arrow-up text-[10px] mr-0.5"
                    :class="activeState.item.tempDiff > 0 ? 'text-orange-500 rotate-0' : 'text-blue-500 rotate-180'"
                  />
                  <span :class="activeState.item.tempDiff > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'">
                    {{ Math.abs(Math.round(activeState.item.tempDiff)) }}°
                  </span>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 指示器位置：动态计算；圆点中心精确落在曲线上，连接线与圆点边缘对齐 -->
        <div
          class="flex flex-col items-center bottom-0 top-0 absolute"
          :style="{ left: `${indicatorX}px` }"
        >
          <div
            class="border-[#10b981] border-[3px] rounded-full bg-white h-3 w-3 absolute z-10"
            :style="{
              top: `${activeState.y}px`,
              transform: 'translateY(-50%)',
              boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.15)',
            }"
          />

          <div
            class="opacity-50 w-[1.5px] bottom-0 absolute from-[#10b981] to-transparent bg-gradient-to-b"
            :style="{ top: `${activeState.y + DOT_RADIUS}px` }"
          />

          <div
            class="border-l border-[#10b981]/30 border-dashed w-[1px] top-0 absolute"
            :style="{ height: `${Math.max(activeState.y - DOT_RADIUS, 0)}px` }"
          />
        </div>
      </div>

      <!-- 布局外层容器 -->
      <div class="flex h-full">
        <!-- 左侧固定标签列 -->
        <div
          class="text-[10px] text-gray-400 font-medium flex flex-shrink-0 flex-col"
          :style="{ width: `${LABEL_WIDTH}px` }"
        >
          <!-- 温度/趋势标签 - 动态高度 -->
          <div
            class="flex items-center justify-center"
            :style="{ height: `${CHART_HEIGHT}px` }"
          >
            <span>温度</span>
          </div>
          <!-- 空气标签 - 对应 h-6 + mt-0 -->
          <div class="mt-0 flex h-6 items-center justify-center">
            <span>空气</span>
          </div>
          <!-- 风力标签 - 对应 h-6 + mt-2 -->
          <div class="mt-2 flex h-6 items-center justify-center">
            <span>风力</span>
          </div>
          <!-- 时间轴留白 - 对应底部时间区域 -->
          <div class="flex-1" />
        </div>

        <!-- 右侧滚动内容区 -->
        <div
          ref="containerRef"
          class="hide-scrollbar flex-1 h-full relative overflow-x-auto"
        >
          <div class="pb-4 flex flex-col relative" :style="{ width: `${totalContentWidth}px` }">
            <div class="relative" :style="{ height: `${CHART_HEIGHT}px` }">
              <!-- 背景层：应用 clip-path 实现曲线上方透明 -->
              <!-- z-index: 10 保证在底层，但高于基础背景 -->
              <div
                class="h-full w-full pointer-events-none inset-0 absolute z-10"
                :style="{ clipPath: `path('${chartData.areaPath}')` }"
              >
                <div class="flex h-full w-full">
                  <div
                    v-for="group in weatherGroups"
                    :key="group.id"
                    class="pb-2 border-r border-gray-100/50 flex flex-col h-full transition-colors items-center justify-end last:border-0 dark:border-gray-700/50"
                    :class="getWeatherBackgroundClass(group.data.code)"
                    :style="{ width: `${group.count * COLUMN_WIDTH}px` }"
                  >
                    <!-- 图标与文字：位于背景内部，受 clip-path 影响 -->
                    <!-- 由于我们预留了 CONTENT_HEIGHT，clip-path 不会切到这里 -->
                    <div class="mb-1 opacity-90 flex flex-col gap-1 items-center">
                      <span class="text-[11px] text-gray-600 font-medium dark:text-gray-300">
                        {{ getWeatherName(group.data.code) }}
                      </span>
                      <div :class="getWeatherIcon(group.data.code, 1)" class="text-xl text-gray-700 dark:text-gray-200" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 图表线条层 -->
              <svg
                class="h-full w-full pointer-events-none left-0 top-0 absolute z-20 overflow-visible"
                :width="totalContentWidth"
                :height="CHART_HEIGHT"
              >
                <!-- 昨天温度曲线 (虚线) -->
                <path
                  :d="chartData.yesterdayLinePath"
                  fill="none"
                  stroke="#10b981"
                  stroke-width="1.5"
                  stroke-dasharray="4 4"
                  stroke-opacity="0.3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                <!-- 今天温度曲线 (实线) - 移除了 fill，因为由下方 div 提供背景 -->
                <path
                  :d="chartData.linePath"
                  fill="none"
                  stroke="#10b981"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="drop-shadow-sm"
                />
              </svg>
            </div>

            <div class="mt-1">
              <div class="flex w-full">
                <div
                  v-for="(item, index) in hourlyData"
                  :key="item.time"
                  class="px-[2px] flex items-center justify-center"
                  :style="{ width: `${COLUMN_WIDTH}px` }"
                >
                  <div
                    class="text-[12px] text-white font-bold rounded flex h-5 w-full transition-all duration-300 items-center justify-center relative overflow-hidden"
                    :class="[
                      getAQIDescription(item.aqi).color.replace('text-', 'bg-'),
                      index === activeState.index
                        ? 'scale-y-100 z-10'
                        : 'opacity-70 scale-y-90',
                    ]"
                  >
                    <span
                      v-if="index === activeState.index"
                      class="relative z-10 animate-fade-in animate-duration-200"
                    >
                      {{ item.aqi }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="mt-2 flex w-full">
                <div
                  v-for="group in windGroups"
                  :key="group.id"
                  class="px-[1px] flex items-center justify-center"
                  :style="{ width: `${group.count * COLUMN_WIDTH}px` }"
                >
                  <div class="rounded bg-gray-100 flex gap-0.5 h-6 w-full items-center justify-center dark:bg-gray-800">
                    <div
                      class="i-tabler-arrow-down text-xs text-gray-400"
                      :style="{ transform: `rotate(${group.data.windDir}deg)` }"
                    />
                    <span class="text-[10px] text-gray-600 font-medium whitespace-nowrap dark:text-gray-400">
                      {{ formatWindSpeed(group.data.windSpeed) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="mt-2 pt-2 border-t border-gray-100 flex w-full dark:border-gray-800">
                <div
                  v-for="(item, index) in hourlyData"
                  :key="item.time"
                  class="text-[11px] flex items-center justify-center"
                  :style="{ width: `${COLUMN_WIDTH}px` }"
                >
                  <!-- 仅展示：第一个(现在)、0点、以及每隔4小时的点 -->
                  <div
                    v-if="index === 0 || [0, 4, 8, 12, 16, 20].includes(hourOf(item.time))"
                    class="flex flex-col items-center"
                  >
                    <span
                      class="font-medium whitespace-nowrap"
                      :class="[
                        index === 0 || hourOf(item.time) === 0
                          ? 'text-primary font-bold'
                          : 'text-gray-400',
                      ]"
                    >
                      <template v-if="index === 0">现在</template>
                      <template v-else-if="hourOf(item.time) === 0">
                        {{ format(parseISO(item.time), 'MM/dd') }}
                      </template>
                      <template v-else>
                        {{ format(parseISO(item.time), 'HH:mm') }}
                      </template>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 右侧固定标签列 -->
        <div
          class="text-[10px] text-gray-400 font-medium flex flex-shrink-0 flex-col"
          :style="{ width: `${LABEL_WIDTH}px` }"
        >
          <!-- 温度/趋势标签 - 动态高度 -->
          <div
            class="flex items-center justify-center"
            :style="{ height: `${CHART_HEIGHT}px` }"
          >
            <span>温度</span>
          </div>
          <!-- 空气标签 - 对应 h-6 + mt-0 -->
          <div class="mt-0 flex h-6 items-center justify-center">
            <span>空气</span>
          </div>
          <!-- 风力标签 - 对应 h-6 + mt-2 -->
          <div class="mt-2 flex h-6 items-center justify-center">
            <span>风力</span>
          </div>
          <!-- 时间轴留白 - 对应底部时间区域 -->
          <div class="flex-1" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 模拟雨滴：30度倾斜的细虚线 + 底部渐变背景 */
.weather-bg-rain {
  background-image:
    /* 上层：雨滴纹理 */
    repeating-linear-gradient(
      120deg,
      transparent,
      transparent 6px,
      rgba(59, 130, 246, 0.2) 6px,
      rgba(59, 130, 246, 0.2) 7px
    ),
    /* 下层：蓝色渐变 (从透明到淡蓝) */
    linear-gradient(to top, transparent 0%, rgba(219, 234, 254, 0.7) 50%, rgba(219, 234, 254, 0.3) 100%);
}

/* 深色模式下的雨滴颜色调整 */
:global(.dark) .weather-bg-rain {
  background-image:
    repeating-linear-gradient(
      120deg,
      transparent,
      transparent 6px,
      rgba(96, 165, 250, 0.2) 6px,
      rgba(96, 165, 250, 0.2) 7px
    ),
    linear-gradient(to top, transparent 0%, rgba(30, 58, 138, 0.2) 50%, rgba(30, 58, 138, 0.1) 100%);
}
</style>
