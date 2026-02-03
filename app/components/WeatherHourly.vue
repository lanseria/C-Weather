<script setup lang="ts">
import { useScroll } from '@vueuse/core'
import dayjs from 'dayjs'
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
// 假设这些工具函数已存在
const { getWeatherIcon, getAQIDescription, getWeatherName, getWindLevel } = useWeatherUtils()

// --- 常量配置 ---
const COLUMN_WIDTH = 56
const CHART_HEIGHT = 176
const CHART_PADDING_Y = 20

// --- 容器引用 ---
const containerRef = ref<HTMLElement | null>(null)
const { x: scrollLeft } = useScroll(containerRef)

// --- Web 端滚轮横向滚动 ---
onMounted(() => {
  const container = containerRef.value
  if (!container)
    return

  const handleWheel = (event: WheelEvent) => {
    // 仅在垂直滚动幅度大于水平滚动时才接管
    // 这样可以避免干扰触控板的水平滚动操作
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      // 阻止页面默认的垂直滚动行为
      event.preventDefault()
      // 将垂直滚动增量应用到水平滚动上
      container.scrollLeft += event.deltaY
    }
  }

  // 添加滚轮事件监听器
  // passive: false 是必需的，因为我们需要调用 preventDefault()
  container.addEventListener('wheel', handleWheel, { passive: false })

  // 组件卸载时移除监听器，防止内存泄漏
  onUnmounted(() => {
    container.removeEventListener('wheel', handleWheel)
  })
})

// --- 数据处理 (保持原逻辑) ---
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

// --- 图表绘制逻辑 (保持原逻辑) ---
function getControlPoint(current: number[], previous: number[], next: number[], reverse = false) {
  const p = previous || current
  const n = next || current
  const smoothing = 0.2
  const lineX = n[0]! - p[0]!
  const lineY = n[1]! - p[1]!
  const length = Math.sqrt(lineX * lineX + lineY * lineY)
  const angle = Math.atan2(lineY, lineX) + (reverse ? Math.PI : 0)
  const controlLength = length * smoothing
  return [current[0]! + Math.cos(angle) * controlLength, current[1]! + Math.sin(angle) * controlLength]
}

const chartData = computed(() => {
  const data = hourlyData.value
  if (!data.length)
    return { linePath: '', areaPath: '', points: [] }

  const temps = data.map(d => d.temp)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const range = maxTemp - minTemp || 1

  const points = data.map((d, i) => {
    const x = i * COLUMN_WIDTH + (COLUMN_WIDTH / 2)
    const normalizeTemp = (d.temp - minTemp) / range
    const availableHeight = CHART_HEIGHT - (CHART_PADDING_Y * 2)
    const y = CHART_HEIGHT - CHART_PADDING_Y - (normalizeTemp * availableHeight)
    return [x, y]
  })

  // 优化路径：从 0 位置开始，以 totalContentWidth 结束
  // 起点：延伸到最左侧 (0, 第一个点的高度)
  let d = `M 0,${points[0]![1]} L ${points[0]![0]},${points[0]![1]}`

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]!
    const next = points[i + 1]!
    const prev = points[i - 1] || current
    const nextNext = points[i + 2] || next
    const cp1 = getControlPoint(current, prev, next)
    const cp2 = getControlPoint(next, nextNext, current, true)
    d += ` C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${next[0]},${next[1]}`
  }

  // 终点：延伸到最右侧 (总宽度, 最后一个点的高度)
  const lastPoint = points[points.length - 1]!
  d += ` L ${totalContentWidth.value},${lastPoint[1]}`

  // 闭合路径：确保背景色占满底部
  const areaPath = `${d} L ${totalContentWidth.value},${CHART_HEIGHT} L 0,${CHART_HEIGHT} Z`

  return { linePath: d, areaPath, points }
})

// --- 激活状态计算 ---
// 不再计算偏移量，而是根据 scrollLeft 计算当前位于“固定线”下的数据索引
const activeState = computed(() => {
  if (!hourlyData.value.length)
    return { index: 0, item: null, y: 0 }

  // 计算当前滚动了多少个完整的列
  // Math.round 确保滚动超过一半时切换到下一个
  let index = Math.round(scrollLeft.value / COLUMN_WIDTH)

  // 边界保护
  if (index < 0)
    index = 0
  if (index >= hourlyData.value.length)
    index = hourlyData.value.length - 1

  // 获取该点的 Y 坐标 (用于定位圆圈)
  // 注意：points 是对应整个长图表的坐标，我们需要 Y 值，X 值在这里不重要
  const point = chartData.value.points[index]
  const y = point ? point[1] : 0

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

    <div class="h-[320px] w-full relative">
      <div class="rounded-xl pointer-events-none inset-0 absolute z-30 overflow-hidden">
        <div
          v-if="activeState.item"
          class="right-2 top-2 absolute z-40"
        >
          <div class="text-white p-3 border border-white/10 rounded-xl bg-[#10b981]/90 flex flex-col min-w-[110px] shadow-lg transition-all duration-300 items-center backdrop-blur-sm">
            <div class="text-xs font-medium mb-1 opacity-95 flex gap-1 whitespace-nowrap items-center">
              <span>{{ dayjs(activeState.item.time).format('HH:mm') }}</span>
              <span>{{ getWeatherName(activeState.item.code) }}</span>
            </div>

            <div class="mb-1 flex gap-1 items-end">
              <span class="text-2xl leading-none tracking-tighter font-bold">{{ Math.round(activeState.item.temp) }}°</span>
            </div>

            <div class="flex flex-col gap-1 w-full">
              <div v-if="activeState.item.tempDiff !== null" class="text-[10px] px-1.5 py-0.5 rounded bg-black/10 flex w-full items-center justify-center">
                <span class="opacity-70">比昨</span>
                <span class="mx-0.5" :class="activeState.item.tempDiff > 0 ? 'i-carbon-arrow-up' : 'i-carbon-arrow-down'" />
                <span>{{ Math.abs(Math.round(activeState.item.tempDiff)) }}°</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 指示器位置：28px (半列宽) + 48px (左侧标签宽度) = 76px -->
        <div class="flex flex-col items-center bottom-0 left-[76px] top-0 absolute">
          <div
            class="border-[3px] border-[#10b981] rounded-full bg-white h-3 w-3 shadow-sm transition-[top] duration-150 ease-out absolute z-10"
            :style="{ top: `${activeState.y! - 6}px` }"
          />

          <div
            class="opacity-50 w-[1.5px] transition-[top] duration-150 ease-out bottom-0 absolute from-[#10b981] to-transparent bg-gradient-to-b"
            :style="{ top: `${activeState.y! + 6}px` }"
          />

          <div
            class="border-l border-[#10b981]/30 border-dashed w-[1px] transition-[height] duration-150 ease-out top-0 absolute"
            :style="{ height: `${activeState.y! - 6}px` }"
          />
        </div>
      </div>

      <!-- 布局外层容器 -->
      <div class="flex h-full">
        <!-- 左侧固定标签列 -->
        <div class="text-[10px] text-gray-400 font-medium flex flex-shrink-0 flex-col w-[48px]">
          <!-- 温度/趋势标签 - 对应 176px 高度的图表 -->
          <div class="flex h-[176px] items-center justify-center">
            <span>温度</span>
          </div>
          <!-- 空气标签 - 对应 h-6 + mt-1 -->
          <div class="mt-1 flex h-6 items-center justify-center">
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
            <div class="h-[176px] relative">
              <div class="flex h-full w-full pointer-events-none left-0 top-0 absolute z-10">
                <div
                  v-for="group in weatherGroups"
                  :key="group.id"
                  class="border-r border-gray-100/50 flex flex-col h-full items-center justify-end last:border-0 dark:border-gray-700/50"
                  :style="{ width: `${group.count * COLUMN_WIDTH}px` }"
                >
                  <div class="mb-2 opacity-80 flex flex-col gap-1 items-center">
                    <span class="text-[11px] text-gray-500 font-medium dark:text-gray-400">
                      {{ getWeatherName(group.data.code) }}
                    </span>
                    <div :class="getWeatherIcon(group.data.code, 1)" class="text-xl text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              </div>

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
                <path :d="chartData.areaPath" fill="url(#tempGradient)" />
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

            <div class="mt-1">
              <div class="flex w-full">
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
                    <span class="relative z-10 drop-shadow-sm">{{ group.data.aqi }}</span>
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
                      class="i-wi-direction-up text-xs text-gray-400"
                      :style="{ transform: `rotate(${group.data.windDir}deg)` }"
                    />
                    <span class="text-[10px] text-gray-600 font-medium whitespace-nowrap dark:text-gray-400">
                      {{ getWindLevel(group.data.windSpeed) }}级
                    </span>
                  </div>
                </div>
              </div>

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
