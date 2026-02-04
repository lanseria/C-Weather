<script setup lang="ts">
import { useSettingsStore } from '~/stores/settings'

defineEmits(['close'])

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="bg-black/30 flex items-center inset-0 justify-center fixed z-50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="m-4 p-6 rounded-2xl bg-white max-w-md w-full shadow-xl animate-fade-in animate-duration-300 dark:bg-gray-800">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-xl font-bold">
          显示设置
        </h2>
        <button class="icon-btn p-2 rounded-full -mr-2" @click="$emit('close')">
          <div class="i-carbon-close text-xl" />
        </button>
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col">
          <label class="text-gray-700 font-medium mb-2 dark:text-gray-300">风速单位</label>
          <div class="gap-2 grid grid-cols-2">
            <button
              v-for="(label, unit) in settingsStore.windSpeedUnitOptions"
              :key="unit"
              class="text-sm px-3 py-2 text-center rounded-lg transition-colors"
              :class="settingsStore.windSpeedUnit === unit
                ? 'bg-primary text-white font-semibold shadow'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'"
              @click="settingsStore.setWindSpeedUnit(unit)"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- 未来可以添加更多设置 -->
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-400">
            未来将支持温度单位 (℃/℉) 和空气质量标准切换。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
