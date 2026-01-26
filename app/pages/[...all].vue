<script setup lang="ts">
const router = useRouter()
</script>

<template>
  <main class="text-gray-700 px-4 py-10 text-center dark:bg-gray-200">
    <div class="text-4xl">
      <div class="i-carbon-warning text-primary inline-block" />
    </div>
    <div>Not found</div>
    <div>
      <button class="text-sm btn m-3 mt-8" @click="router.back()">
        Back
      </button>
    </div>
  </main>
</template>
