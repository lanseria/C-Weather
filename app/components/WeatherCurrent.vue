<script setup lang="ts">
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
const { getWeatherIcon, getAQIDescription, formatWindSpeed } = useWeatherUtils()

const current = computed(() => weatherStore.weatherData?.current)
const aqiInfo = computed(() => current.value ? getAQIDescription(current.value.us_aqi || 0) : { text: '-', color: '' })
</script>

<template>
  <div v-if="current" class="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div class="flex flex-col gap-6 items-center justify-between md:flex-row">
      <!-- 左侧：主要信息 -->
      <div class="text-center md:text-left">
        <div class="text-sm text-gray-500 font-medium mb-1 dark:text-gray-400">
          当前天气
        </div>
        <div class="flex gap-4 items-center justify-center md:justify-start">
          <div :class="getWeatherIcon(current.weather_code, current.is_day)" class="text-6xl text-primary" />
          <div>
            <div class="text-5xl tracking-tighter font-bold">
              {{ Math.round(current.temperature_2m) }}°
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              体感 {{ Math.round(current.apparent_temperature) }}°
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：详情网格 -->
      <div class="gap-x-8 gap-y-4 grid grid-cols-2 w-full md:w-auto">
        <!-- 空气质量 (保持 Carbon 或使用 generic) -->
        <div class="flex flex-col">
          <span class="text-xs text-gray-400">空气质量</span>
          <div class="flex gap-2 items-center">
            <div class="i-tabler-leaf text-lg text-gray-600 dark:text-gray-300" />
            <span class="font-medium" :class="aqiInfo.color">{{ current.us_aqi }} {{ aqiInfo.text }}</span>
          </div>
        </div>
        <!-- 湿度 -->
        <div class="flex flex-col">
          <span class="text-xs text-gray-400">湿度</span>
          <div class="flex gap-2 items-center">
            <div class="i-wi-humidity text-xl text-blue-500" />
            <span class="font-medium">{{ current.relative_humidity_2m }}%</span>
          </div>
        </div>
        <!-- 风力 -->
        <div class="flex flex-col">
          <span class="text-xs text-gray-400">风速</span>
          <div class="flex gap-2 items-center">
            <div class="i-wi-strong-wind text-xl text-gray-600 dark:text-gray-300" />
            <span class="font-medium">{{ formatWindSpeed(current.wind_speed_10m) }}</span>
          </div>
        </div>
        <!-- 风向 -->
        <div class="flex flex-col">
          <span class="text-xs text-gray-400">风向</span>
          <div class="flex gap-2 items-center">
            <div
              class="i-wi-direction-up text-xl text-gray-600 transition-transform duration-500 dark:text-gray-300"
              :style="{ transform: `rotate(${current.wind_direction_10m}deg)` }"
            />
            <span class="font-medium">{{ current.wind_direction_10m }}°</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
