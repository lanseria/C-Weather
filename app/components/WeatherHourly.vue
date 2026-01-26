<script setup lang="ts">
import dayjs from 'dayjs'
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
const { getWeatherIcon } = useWeatherUtils()

// 只取未来24小时
const hourlyData = computed(() => {
  const data = weatherStore.weatherData?.hourly
  if (!data)
    return []

  const currentHour = dayjs().startOf('hour')
  const startIndex = data.time.findIndex(t => dayjs(t).isSame(currentHour))

  if (startIndex === -1)
    return []

  return data.time.slice(startIndex, startIndex + 24).map((time, i) => {
    const index = startIndex + i
    return {
      time,
      temp: data.temperature_2m[index],
      code: data.weather_code[index],
      windSpeed: data.wind_speed_10m[index],
      windDir: data.wind_direction_10m[index],
      aqi: data.us_aqi ? data.us_aqi[index] : 0,
    }
  })
})
</script>

<template>
  <div v-if="hourlyData.length" class="mt-6">
    <h3 class="text-lg font-semibold mb-4 px-1">
      逐小时预报
    </h3>
    <div class="hide-scrollbar pb-4 flex gap-4 overflow-x-auto">
      <div
        v-for="item in hourlyData"
        :key="item.time"
        class="p-3 border border-gray-100 rounded-xl bg-white flex flex-shrink-0 flex-col gap-2 min-w-[5rem] w-20 items-center dark:border-gray-700 dark:bg-gray-800"
      >
        <span class="text-xs text-gray-500">{{ dayjs(item.time).format('HH:mm') }}</span>
        <div :class="getWeatherIcon(item.code)" class="text-2xl text-primary my-1" />
        <span class="text-lg font-bold">{{ Math.round(item.temp) }}°</span>

        <div class="mt-1 flex flex-col gap-1 items-center">
          <!-- AQI 保持简洁 -->
          <div class="text-xs text-gray-400 flex gap-1 items-center">
            <div class="i-tabler-leaf h-3 w-3" />
            <span>{{ item.aqi }}</span>
          </div>
          <!-- 风速风向 -->
          <div class="text-xs text-gray-400 flex gap-1 items-center">
            <div
              class="i-wi-direction-up h-3 w-3"
              :style="{ transform: `rotate(${item.windDir}deg)` }"
            />
            <span>{{ Math.round(item.windSpeed) }}</span>
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
