<script setup lang="ts">
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
const isSettingsOpen = ref(false)
const isHelpOpen = ref(false) // 新增控制状态

onMounted(() => {
  weatherStore.fetchWeather()
})
</script>

<template>
  <div class="mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-6 flex items-end justify-between">
      <div>
        <h1 class="text-2xl text-white font-bold drop-shadow">
          {{ weatherStore.location.name }}
        </h1>
        <p class="text-sm text-white/70 mt-1 drop-shadow">
          {{ new Date().toLocaleDateString() }}
        </p>
      </div>

      <div class="text-white/90 flex gap-2 items-center">
        <!-- 新增帮助按钮 -->
        <button
          class="icon-btn p-2 rounded-full hover:bg-white/20"
          title="参数帮助"
          @click="isHelpOpen = true"
        >
          <div class="i-carbon-help text-xl" />
        </button>

        <button
          class="icon-btn p-2 rounded-full hover:bg-white/20"
          title="设置"
          @click="isSettingsOpen = true"
        >
          <div class="i-carbon-settings text-xl" />
        </button>
        <button
          class="icon-btn p-2 rounded-full hover:bg-white/20"
          :class="{ 'animate-spin': weatherStore.loading }"
          title="刷新"
          @click="weatherStore.fetchWeather()"
        >
          <div class="i-carbon-renew text-xl" />
        </button>
      </div>
    </div>

    <div v-if="weatherStore.loading && !weatherStore.weatherData" class="text-white/80 py-20 text-center drop-shadow">
      <div class="i-carbon-circle-dash text-4xl text-white/90 mb-4 inline-block animate-spin" />
      <p>正在获取气象数据...</p>
    </div>

    <div v-else class="animate-fade-in animate-duration-500">
      <WeatherCurrent />
      <WeatherHourly />
      <WeatherDaily />
    </div>

    <Teleport to="body">
      <SettingsModal v-if="isSettingsOpen" @close="isSettingsOpen = false" />
      <HelpModal v-if="isHelpOpen" @close="isHelpOpen = false" />
    </Teleport>
  </div>
</template>
