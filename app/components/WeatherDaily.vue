<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useWeatherStore } from '~/stores/weather'

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
    <h3 class="text-lg text-white font-semibold mb-4 px-1 drop-shadow">
      未来 7 天
    </h3>
    <div class="flex flex-col gap-3">
      <div
        v-for="item in dailyData"
        :key="item.time"
        class="p-4 glass rounded-xl gap-4 grid grid-cols-[1fr_auto_1fr] transition-shadow items-center hover:bg-white/15 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] hover:shadow-lg"
      >
        <!-- 日期与总体天气 -->
        <div class="flex gap-3 items-center">
          <div :class="getWeatherIcon(item.code)" class="text-3xl text-sky-300 flex-shrink-0" />
          <div class="flex flex-col">
            <span class="text-sm font-medium">{{ format(parseISO(item.time), 'MM/dd EEEE', { locale: zhCN }) }}</span>
            <span class="text-xs text-white/60">{{ getWeatherName(item.code) }}</span>
          </div>
        </div>

        <!-- 温度范围 (移动端居中) -->
        <div class="text-center md:text-left">
          <span class="font-bold">{{ formatTemperature(item.maxTemp) }}</span>
          <span class="text-white/40 mx-1">/</span>
          <span class="text-white/60">{{ formatTemperature(item.minTemp) }}</span>
        </div>

        <!-- 空气质量 (桌面端显示) -->
        <div class="gap-2 hidden items-center md:flex">
          <div class="i-tabler-leaf text-white/50" />
          <span :class="getAQIDescription(item.aqi).color" class="text-sm font-medium">
            {{ item.aqi }} {{ getAQIDescription(item.aqi).text }}
          </span>
        </div>

        <!-- 风速 (桌面端显示) -->
        <div class="text-sm text-white/70 flex-col hidden md:flex">
          <div class="flex gap-1 items-center">
            <div class="i-wi-strong-wind text-lg" />
            <span>均 {{ formatWindSpeed(item.windSpeed) }}</span>
          </div>
        </div>

        <!-- 阵风 (桌面端显示) -->
        <div class="text-sm text-white/70 flex-col hidden md:flex">
          <div class="flex gap-1 items-center">
            <div class="i-wi-gale-warning text-lg" />
            <span>阵 {{ formatWindSpeed(item.gusts) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
