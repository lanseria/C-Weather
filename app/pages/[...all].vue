<script setup lang="ts">
const router = useRouter()
</script>

<template>
  <main class="text-white px-4 py-10 text-center">
    <div class="text-4xl">
      <div class="i-carbon-warning text-sky-300 inline-block" />
    </div>
    <div>Not found</div>
    <div>
      <button class="text-sm btn m-3 mt-8" @click="router.back()">
        Back
      </button>
    </div>
  </main>
</template>
