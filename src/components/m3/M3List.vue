<script setup lang="ts">
withDefaults(defineProps<{ dense?: boolean }>(), { dense: false })
</script>

<template>
  <ul class="md-list" :class="{ 'md-list--dense': dense }" role="list">
    <slot />
  </ul>
</template>

<style scoped>
.md-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding-block: 8px;
  list-style: none;
}

.md-list--dense {
  padding-block: 4px;
}
</style>
