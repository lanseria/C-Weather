<script setup lang="ts">
defineEmits(['close'])
</script>

<template>
  <div class="bg-black/30 flex items-center inset-0 justify-center fixed z-50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="m-4 p-6 rounded-2xl bg-white max-w-sm w-full shadow-xl animate-fade-in animate-duration-300 dark:bg-gray-800">
      <div class="mb-5 flex items-center justify-between">
        <h2 class="text-lg font-bold">
          URL 参数设置
        </h2>
        <button class="icon-btn p-2 rounded-full -mr-2" @click="$emit('close')">
          <div class="i-carbon-close text-xl" />
        </button>
      </div>

      <div class="text-sm space-y-4">
        <p class="text-gray-600 dark:text-gray-300">
          你可以通过 URL 参数来指定显示的城市位置：
        </p>

        <ul class="text-gray-500 space-y-2 dark:text-gray-400">
          <li class="flex items-center justify-between">
            <span>纬度</span>
            <code class="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">lat</code>
          </li>
          <li class="flex items-center justify-between">
            <span>经度</span>
            <code class="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">lon</code>
          </li>
          <li class="flex items-center justify-between">
            <span>地名 (可选)</span>
            <code class="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">name</code>
          </li>
        </ul>

        <div class="p-3 border border-gray-100 rounded-lg bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <div class="text-[10px] text-gray-400 tracking-wider font-bold mb-1.5 uppercase">
            Example (舟山)
          </div>
          <div class="text-xs text-primary leading-relaxed font-mono break-all">
            ?lat=29.9958&lon=122.2061&name=Zhoushan
          </div>
        </div>

        <div class="pt-2">
          <a href="/?lat=29.9958&lon=122.2061&name=Zhoushan" class="text-sm btn w-full justify-center">
            <div class="i-carbon-launch" />
            使用示例坐标测试
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
