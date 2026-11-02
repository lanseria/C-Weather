<script setup lang="ts">
defineEmits(['close'])
</script>

<template>
  <div class="bg-black/30 flex items-center inset-0 justify-center fixed z-50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="m-4 p-6 glass max-w-sm w-full animate-fade-in animate-duration-300">
      <div class="mb-5 flex items-center justify-between">
        <h2 class="text-lg font-bold">
          URL 参数设置
        </h2>
        <button class="icon-btn p-2 rounded-full -mr-2" @click="$emit('close')">
          <div class="i-carbon-close text-xl" />
        </button>
      </div>

      <div class="text-sm space-y-4">
        <p class="text-white/80">
          你可以通过 URL 参数来指定显示的城市位置：
        </p>

        <ul class="text-white/60 space-y-2">
          <li class="flex items-center justify-between">
            <span>纬度</span>
            <code class="text-xs text-white/90 font-mono px-1.5 py-0.5 rounded bg-white/15">lat</code>
          </li>
          <li class="flex items-center justify-between">
            <span>经度</span>
            <code class="text-xs text-white/90 font-mono px-1.5 py-0.5 rounded bg-white/15">lon</code>
          </li>
          <li class="flex items-center justify-between">
            <span>地名 (可选)</span>
            <code class="text-xs text-white/90 font-mono px-1.5 py-0.5 rounded bg-white/15">name</code>
          </li>
        </ul>

        <div class="p-3 border border-white/10 rounded-lg bg-black/20">
          <div class="text-[10px] text-white/40 tracking-wider font-bold mb-1.5 uppercase">
            Example (舟山)
          </div>
          <div class="text-xs text-sky-300 leading-relaxed font-mono break-all">
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
