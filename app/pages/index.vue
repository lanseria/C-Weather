<script setup lang="ts">
import { useWeatherStore } from '~/stores/weather'

const weatherStore = useWeatherStore()
const isSettingsOpen = ref(false)

// --- 主题切换逻辑 ---
const color = useColorMode()

useHead({
  meta: [{
    id: 'theme-color',
    name: 'theme-color',
    content: () => color.value === 'dark' ? '#222222' : '#ffffff',
  }],
})

function toggleDark() {
  color.preference = color.value === 'dark' ? 'light' : 'dark'
}

onMounted(() => {
  weatherStore.fetchWeather()
})
</script>

<template>
  <div class="mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-6 flex items-end justify-between">
      <div>
        <h1 class="text-2xl text-gray-900 font-bold dark:text-white">
          {{ weatherStore.location.name }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ new Date().toLocaleDateString() }}
        </p>
      </div>

      <div class="flex gap-2 items-center">
        <button
          class="icon-btn p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          title="切换主题"
          @click="toggleDark"
        >
          <div class="i-carbon-sun dark:i-carbon-moon text-xl" />
        </button>

        <button
          class="icon-btn p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          title="设置"
          @click="isSettingsOpen = true"
        >
          <div class="i-carbon-settings text-xl" />
        </button>
        <button
          class="icon-btn p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          :class="{ 'animate-spin': weatherStore.loading }"
          title="刷新"
          @click="weatherStore.fetchWeather()"
        >
          <div class="i-carbon-renew text-xl" />
        </button>
      </div>
    </div>

    <div v-if="weatherStore.loading && !weatherStore.weatherData" class="text-gray-500 py-20 text-center">
      <div class="i-carbon-circle-dash text-4xl text-primary mb-4 inline-block animate-spin" />
      <p>正在获取气象数据...</p>
    </div>

    <div v-else class="animate-fade-in animate-duration-500">
      <WeatherCurrent />
      <WeatherHourly />
      <WeatherDaily />
    </div>

    <Teleport to="body">
      <SettingsModal v-if="isSettingsOpen" @close="isSettingsOpen = false" />
    </Teleport>
  </div>
</template>
