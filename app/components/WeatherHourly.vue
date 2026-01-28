<script setup lang="ts">
import { useElementSize, useScroll } from '@vueuse/core'
import dayjs from 'dayjs'
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
const { getWeatherIcon, getAQIDescription, getWeatherName, getWindLevel } = useWeatherUtils()

// 每一列的基础宽度 (px)
const COLUMN_WIDTH = 56

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

// --- 分组逻辑 (保持不变) ---
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
  // 防止除以0
  const scrollRange = maxScroll > 0 ? maxScroll : 1

  // 计算滚动进度 (0 ~ 1)
  const progress = Math.min(Math.max(scrollLeft.value / scrollRange, 0), 1)

  // 1. 计算 Marker 在屏幕上的偏移量 (从左到右)
  // 当 progress = 0, offset = 0 + 半个格子
  // 当 progress = 1, offset = 容器宽度 - 半个格子
  // 减去 COLUMN_WIDTH 是为了让线始终在可视区域内，不会贴死边缘
  const safeZone = containerWidth.value - COLUMN_WIDTH
  const offset = (progress * safeZone) + (COLUMN_WIDTH / 2)

  // 2. 根据进度计算当前对应的“激活”数据索引
  // 这利用了一个数学巧合：滚动进度映射到屏幕位置，和数据索引映射是对应的
  const totalItems = hourlyData.value.length
  const activeIndex = Math.min(Math.round(progress * (totalItems - 1)), totalItems - 1)

  return {
    offset, // 线的 left 值 (px)
    index: activeIndex,
    item: hourlyData.value[activeIndex],
  }
})

// --- ECharts 配置 ---
const chartOption = computed(() => {
  const data = hourlyData.value
  const temps = data.map(d => Math.round(d.temp))
  const lineColor = '#10b981' // 绿色 (Primary Green)

  const min = Math.min(...temps)
  const max = Math.max(...temps)

  return {
    grid: {
      // 关键修改：左右设为 0，让线条填满
      left: 0,
      right: 0,
      top: 45, // 留出顶部 Tooltip 的空间
      bottom: 10,
      show: false,
    },
    xAxis: {
      type: 'category',
      show: false,
      boundaryGap: false, // 点在线上
      data: data.map(d => d.time),
    },
    yAxis: {
      type: 'value',
      show: false,
      min: min - 3,
      max: max + 3,
    },
    series: [
      {
        data: temps,
        type: 'line',
        smooth: true,
        symbol: 'none', // 默认不显示点，只在 Marker 处我们自己画
        lineStyle: { width: 3, color: lineColor },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' },
            ],
          },
        },
      },
    ],
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
        Marker 指示器层 (Fixed/Sticky Overlay)
        它悬浮在滚动内容之上，不随内容滚动，而是根据滚动进度移动位置
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
        <!-- 注意：这里的 top 需要微调以对齐图表，这里简化处理，视觉上在图表区域 -->
        <div class="mb-1 mt-9 border-3 border-[#10b981] rounded-full bg-white h-3 w-3 shadow-sm" />

        <!-- 3. 竖线 -->
        <div class="opacity-50 flex-1 w-[1.5px] from-[#10b981] to-transparent bg-gradient-to-b" />
      </div>

      <!-- 内容层 -->
      <div class="pb-4 flex flex-col relative" :style="{ width: `${totalContentWidth}px` }">
        <!-- 图表与天气层 -->
        <div class="h-44 relative">
          <!-- 绝对定位的天气图标 -->
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
          <VChartFull class="h-full w-full" :option="chartOption" :autoresize="true" />
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
