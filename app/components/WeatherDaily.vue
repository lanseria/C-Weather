<script setup lang="ts">
import dayjs from 'dayjs'
import { useWeatherStore } from '~/stores/weather'
import 'dayjs/locale/zh-cn'

const weatherStore = useWeatherStore()
const { getWeatherIcon, getAQIDescription, formatWindSpeed, formatTemperature, getWeatherName } = useWeatherUtils()

const dailyData = computed(() => {
  const data = weatherStore.weatherData?.daily
  if (!data)
    return []

  return data.time.map((time, i) => ({
    time,
    code: data.weather_code[i]!,
    maxTemp: data.temperature_2m_max[i]!,
    minTemp: data.temperature_2m_min[i]!,
    windSpeed: data.wind_speed_10m_max[i]!,
    gusts: data.wind_gusts_10m_max[i]!,
    aqi: data.us_aqi_mean ? data.us_aqi_mean[i]! : 0,
  }))
})
</script>

<template>
  <div v-if="dailyData.length" class="mb-10 mt-6">
    <h3 class="text-lg font-semibold mb-4 px-1">
      未来 7 天
    </h3>
    <div class="flex flex-col gap-3">
      <div
        v-for="item in dailyData"
        :key="item.time"
        class="p-4 border border-gray-100 rounded-xl bg-white gap-4 grid grid-cols-[1fr_auto_1fr] transition-shadow items-center dark:border-gray-700 dark:bg-gray-800 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] hover:shadow-md"
      >
        <!-- 日期与总体天气 -->
        <div class="flex gap-3 items-center">
          <div :class="getWeatherIcon(item.code)" class="text-3xl text-primary flex-shrink-0" />
          <div class="flex flex-col">
            <span class="text-sm font-medium">{{ dayjs(item.time).locale('zh-cn').format('MM/DD dddd') }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ getWeatherName(item.code) }}</span>
          </div>
        </div>

        <!-- 温度范围 (移动端居中) -->
        <div class="text-center md:text-left">
          <span class="font-bold">{{ formatTemperature(item.maxTemp) }}</span>
          <span class="text-gray-400 mx-1">/</span>
          <span class="text-gray-500">{{ formatTemperature(item.minTemp) }}</span>
        </div>

        <!-- 空气质量 (桌面端显示) -->
        <div class="gap-2 hidden items-center md:flex">
          <div class="i-tabler-leaf text-gray-400" />
          <span :class="getAQIDescription(item.aqi).color" class="text-sm font-medium">
            {{ item.aqi }} {{ getAQIDescription(item.aqi).text }}
          </span>
        </div>

        <!-- 风速 (桌面端显示) -->
        <div class="text-sm text-gray-500 flex-col hidden md:flex">
          <div class="flex gap-1 items-center">
            <div class="i-wi-strong-wind text-lg" />
            <span>均 {{ formatWindSpeed(item.windSpeed) }}</span>
          </div>
        </div>

        <!-- 阵风 (桌面端显示) -->
        <div class="text-sm text-gray-500 flex-col hidden md:flex">
          <div class="flex gap-1 items-center">
            <div class="i-wi-gale-warning text-lg" />
            <span>阵 {{ formatWindSpeed(item.gusts) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
