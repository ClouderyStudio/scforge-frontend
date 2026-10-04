<script setup lang="ts">
import PluginCard from './PluginCard.vue'
import type { PluginSummary } from '@/api/types'

withDefaults(defineProps<{ plugins: PluginSummary[]; columns?: 'auto' | 'wide' }>(), { columns: 'auto' })
</script>

<template>
  <div class="sc-grid" :class="'sc-grid--' + columns">
    <TransitionGroup name="sc-grid">
      <PluginCard v-for="plugin in plugins" :key="plugin.id" :plugin="plugin" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.sc-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
}

.sc-grid--wide {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr));
}

.sc-grid-move,
.sc-grid-enter-active,
.sc-grid-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate),
    transform var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate);
}

.sc-grid-enter-from,
.sc-grid-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.sc-grid-leave-active {
  position: absolute;
}
</style>
