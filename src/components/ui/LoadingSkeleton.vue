<script setup lang="ts">
withDefaults(defineProps<{ label?: string; rows?: number }>(), { label: '正在加载…', rows: 3 })
</script>

<template>
  <div class="sc-loading" role="status" :aria-label="label">
    <div v-for="row in rows" :key="row" class="sc-loading__row" :style="{ animationDelay: row * 80 + 'ms' }">
      <span class="sc-loading__thumb" />
      <span class="sc-loading__lines">
        <span class="sc-loading__line sc-loading__line--title" />
        <span class="sc-loading__line" />
        <span class="sc-loading__line sc-loading__line--short" />
      </span>
    </div>
    <span class="sr-only">{{ label }}</span>
  </div>
</template>

<style scoped>
.sc-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sc-loading__row {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
}

.sc-loading__thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-high);
  animation: sc-pulse 1.4s var(--md-sys-motion-easing-standard) infinite;
}

.sc-loading__lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.sc-loading__line {
  height: 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  animation: sc-pulse 1.4s var(--md-sys-motion-easing-standard) infinite;
}

.sc-loading__line--title {
  width: 38%;
  height: 16px;
}

.sc-loading__line--short {
  width: 62%;
}

@keyframes sc-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
