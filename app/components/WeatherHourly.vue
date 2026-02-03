<script setup lang="ts">
import { useElementSize, useScroll } from '@vueuse/core'
import dayjs from 'dayjs'
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
const { getWeatherIcon, getAQIDescription, getWeatherName, getWindLevel } = useWeatherUtils()

// 每一列的基础宽度 (px)
const COLUMN_WIDTH = 56
// 图表高度配置
const CHART_HEIGHT = 176 // h-44 = 176px
const CHART_PADDING_Y = 20 // 上下预留空间防止贴边

// 滚动容器引用
const containerRef = ref<HTMLElement | null>(null)
// 使用 VueUse 获取滚动状态和容器尺寸
const { x: scrollLeft } = useScroll(containerRef)
const { width: containerWidth } = useElementSize(containerRef)

// --- 数据处理 ---
const hourlyData = computed(() => {
  const data = weatherStore.weatherData?.hourly
  if (!data)
    return []

  const currentHour = dayjs().startOf('hour')
  const startIndex = data.time.findIndex(t => dayjs(t).isSame(currentHour))

  if (startIndex === -1)
    return []

  return data.time.slice(startIndex).map((time, i) => {
    const index = startIndex + i
    // 计算前一天的温度用于对比 (如果有)
    const prevTemp = index > 23 ? data.temperature_2m[index - 24] : null
    const tempDiff = prevTemp !== null ? data.temperature_2m[index]! - prevTemp! : null

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
const aqiGroups = computed(() => groupData(hourlyData.value, (a, b) => getAQIDescription(a.aqi).color === getAQIDescription(b.aqi).color))
const windGroups = computed(() => groupData(hourlyData.value, (a, b) => getWindLevel(a.windSpeed) === getWindLevel(b.windSpeed)))

// --- 核心交互逻辑：计算标记线位置与当前激活数据 ---
const markerState = computed(() => {
  if (!hourlyData.value.length || containerWidth.value === 0)
    return { offset: 0, index: 0, item: null }

  const maxScroll = totalContentWidth.value - containerWidth.value
  const scrollRange = maxScroll > 0 ? maxScroll : 1
  const progress = Math.min(Math.max(scrollLeft.value / scrollRange, 0), 1)

  const safeZone = containerWidth.value - COLUMN_WIDTH
  const offset = (progress * safeZone) + (COLUMN_WIDTH / 2)

  const totalItems = hourlyData.value.length
  const activeIndex = Math.min(Math.round(progress * (totalItems - 1)), totalItems - 1)

  return {
    offset,
    index: activeIndex,
    item: hourlyData.value[activeIndex],
  }
})

// --- SVG 图表绘制逻辑 ---

/**
 * 简单的 Catmull-Rom 样条曲线转 Bezier 算法，用于生成平滑曲线
 */
function getControlPoint(current: number[], previous: number[], next: number[], reverse = false) {
  const p = previous || current
  const n = next || current
  // 平滑系数，0.2 比较接近 ECharts 的默认平滑效果
  const smoothing = 0.2

  const lineX = n[0]! - p[0]!
  const lineY = n[1]! - p[1]!
  const length = Math.sqrt(lineX * lineX + lineY * lineY)
  const angle = Math.atan2(lineY, lineX) + (reverse ? Math.PI : 0)

  const controlLength = length * smoothing
  const x = current[0]! + Math.cos(angle) * controlLength
  const y = current[1]! + Math.sin(angle) * controlLength

  return [x, y]
}

const chartData = computed(() => {
  const data = hourlyData.value
  if (!data.length)
    return { linePath: '', areaPath: '', points: [] }

  const temps = data.map(d => d.temp)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const range = maxTemp - minTemp || 1

  // 1. 计算所有点的坐标
  const points = data.map((d, i) => {
    // X轴：居中对齐到列
    const x = i * COLUMN_WIDTH + (COLUMN_WIDTH / 2)
    // Y轴：线性插值映射到高度，保留上下 Padding
    // 注意 SVG 坐标系 Y 向下，所以最大温度对应最小 Y 值
    const normalizeTemp = (d.temp - minTemp) / range
    const availableHeight = CHART_HEIGHT - (CHART_PADDING_Y * 2)
    const y = CHART_HEIGHT - CHART_PADDING_Y - (normalizeTemp * availableHeight)
    return [x, y]
  })

  // 2. 生成平滑路径 (Cubic Bezier)
  let d = `M ${points[0]![0]},${points[0]![1]}`

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]!
    const next = points[i + 1]!
    const prev = points[i - 1] || current
    const nextNext = points[i + 2] || next

    const cp1 = getControlPoint(current, prev, next)
    const cp2 = getControlPoint(next, nextNext, current, true)

    d += ` C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${next[0]},${next[1]}`
  }

  // 3. 生成区域填充路径 (闭合底部)
  const areaPath = `${d} L ${points[points.length - 1]![0]},${CHART_HEIGHT} L ${points[0]![0]},${CHART_HEIGHT} Z`

  return {
    linePath: d,
    areaPath,
    points, // 用于 Marker 定位圆点
  }
})
</script>

<template>
  <div v-if="hourlyData.length" class="group mt-6 select-none relative">
    <!-- 标题 -->
    <div class="mb-4 px-1 flex items-center justify-between">
      <h3 class="text-lg font-semibold">
        逐小时预报
      </h3>
      <span class="text-xs text-gray-400">滑动查看趋势</span>
    </div>

    <!-- 滚动容器 -->
    <div
      ref="containerRef"
      class="hide-scrollbar px-4 relative overflow-x-auto -mx-4 md:mx-0 md:px-0"
    >
      <!--
        Marker 指示器层
        悬浮在滚动内容之上，不随内容滚动，而是根据滚动进度移动位置
      -->
      <div
        v-if="markerState.item"
        class="will-change-transform flex flex-col h-[260px] pointer-events-none transition-transform duration-75 ease-out items-center top-0 absolute z-30"
        :style="{ transform: `translateX(${markerState.offset}px) translateX(-50%)` }"
      >
        <!-- 1. 顶部 Tooltip 卡片 -->
        <div class="text-white mb-1 p-2 px-3 text-center rounded-xl bg-[#10b981] min-w-[100px] shadow-lg">
          <div class="text-xs font-medium mb-0.5 opacity-90 whitespace-nowrap">
            {{ dayjs(markerState.item.time).format('MM/DD HH:mm') }} {{ getWeatherName(markerState.item.code) }}
          </div>
          <div class="flex gap-2 items-center justify-center">
            <span class="text-xl leading-none font-bold">{{ Math.round(markerState.item.temp) }}°</span>
            <div v-if="markerState.item.tempDiff !== null" class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 flex items-center">
              <span>比昨天</span>
              <div
                class="ml-0.5"
                :class="markerState.item.tempDiff > 0 ? 'i-carbon-arrow-up' : markerState.item.tempDiff < 0 ? 'i-carbon-arrow-down' : ''"
              />
              <span>{{ Math.abs(Math.round(markerState.item.tempDiff)) }}°</span>
            </div>
          </div>
        </div>

        <!-- 2. 圆圈 (指示温度点) -->
        <!-- 根据计算出的 Y 坐标动态定位，保证圆圈始终在线上 -->
        <div
          class="border-3 border-[#10b981] rounded-full bg-white h-3 w-3 shadow-sm top-0 absolute"
          :style="{ marginTop: `${chartData.points[markerState.index] ? chartData.points[markerState.index]![1]! - 6 : 0}px` }"
        />

        <!-- 3. 竖线 -->
        <div class="mt-9 opacity-50 flex-1 w-[1.5px] from-[#10b981] to-transparent bg-gradient-to-b" />
      </div>

      <!-- 内容层 -->
      <div class="pb-4 flex flex-col relative" :style="{ width: `${totalContentWidth}px` }">
        <!-- 图表与天气层 -->
        <div class="h-44 relative">
          <!-- 背景天气图标 -->
          <div class="pt-2 flex w-full pointer-events-none left-0 top-0 absolute z-10">
            <div
              v-for="group in weatherGroups"
              :key="group.id"
              class="border-r border-gray-100/50 flex flex-col h-full items-center justify-start last:border-0 dark:border-gray-700/50"
              :style="{ width: `${group.count * COLUMN_WIDTH}px` }"
            >
              <div class="mt-1 opacity-80 flex flex-col gap-1 items-center">
                <span class="text-[11px] text-gray-500 font-medium dark:text-gray-400">
                  {{ getWeatherName(group.data.code) }}
                </span>
                <div :class="getWeatherIcon(group.data.code, 1)" class="text-xl text-gray-500 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <!-- SVG 图表 -->
          <svg
            class="h-full w-full left-0 top-0 absolute z-20 overflow-visible"
            :width="totalContentWidth"
            :height="CHART_HEIGHT"
          >
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
              </linearGradient>
            </defs>
            <!-- 填充区域 -->
            <path
              :d="chartData.areaPath"
              fill="url(#tempGradient)"
            />
            <!-- 折线 -->
            <path
              :d="chartData.linePath"
              fill="none"
              stroke="#10b981"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <!-- 空气质量 -->
        <div class="mt-1 flex w-full">
          <div
            v-for="group in aqiGroups"
            :key="group.id"
            class="px-[1px] flex items-center justify-center"
            :style="{ width: `${group.count * COLUMN_WIDTH}px` }"
          >
            <div
              class="text-[10px] text-white font-bold rounded flex h-6 w-full transition-colors items-center justify-center relative overflow-hidden"
              :class="getAQIDescription(group.data.aqi).color.replace('text-', 'bg-')"
            >
              <span class="relative z-10 drop-shadow-sm">
                {{ group.count > 1 ? group.data.aqi : group.data.aqi }}
              </span>
            </div>
          </div>
        </div>

        <!-- 风力 -->
        <div class="mt-2 flex w-full">
          <div
            v-for="group in windGroups"
            :key="group.id"
            class="px-[1px] flex items-center justify-center"
            :style="{ width: `${group.count * COLUMN_WIDTH}px` }"
          >
            <div class="rounded bg-gray-100 flex flex-col gap-0.5 h-10 w-full items-center justify-center dark:bg-gray-800">
              <div
                class="i-wi-direction-up text-xs text-gray-400"
                :style="{ transform: `rotate(${group.data.windDir}deg)` }"
              />
              <span class="text-[10px] text-gray-600 font-medium whitespace-nowrap dark:text-gray-400">
                {{ getWindLevel(group.data.windSpeed) }}级
              </span>
            </div>
          </div>
        </div>

        <!-- 时间 -->
        <div class="mt-2 pt-2 border-t border-gray-100 flex w-full dark:border-gray-800">
          <div
            v-for="item in hourlyData"
            :key="item.time"
            class="text-xs flex items-center justify-center"
            :style="{ width: `${COLUMN_WIDTH}px` }"
          >
            <div class="flex flex-col items-center">
              <span
                class="font-medium"
                :class="dayjs(item.time).hour() === 0 ? 'text-primary font-bold' : 'text-gray-400'"
              >
                {{ dayjs(item.time).hour() === 0 ? dayjs(item.time).format('MM/DD') : dayjs(item.time).format('HH:mm') }}
              </span>
            </div>
          </div>
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
</style>
