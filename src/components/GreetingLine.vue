<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
  <text class="greeting">
    {{ text }}
  </text>
</template>

<style scoped lang="scss">
.greeting {
  display: block;
  font-size: $fs-greeting;
  font-weight: $fw-normal;
  line-height: $lh-normal;
  color: $ink;
}
</style>
