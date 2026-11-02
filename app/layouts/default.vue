<script setup lang="ts">
</script>

<template>
  <main class="text-white font-sans min-h-screen relative">
    <!-- iOS 风格动态天气背景 -->
    <WeatherBackground />
    <div class="relative z-10">
      <slot />
    </div>
  </main>
</template>
