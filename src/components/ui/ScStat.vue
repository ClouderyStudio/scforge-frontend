<script setup lang="ts">
import type { IconComponent } from '@/icons'
import { M3Icon } from '@/components/m3'

withDefaults(
  defineProps<{
    icon: IconComponent
    /** Already formatted for display. */
    value: string | number
    label: string
    /** Highlight as a positive signal (the score chip). */
    tone?: 'neutral' | 'primary' | 'positive' | 'negative'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="sc-stat" :class="'sc-stat--' + tone" :title="label">
    <M3Icon :icon="icon" :size="16" />
    <span class="md-typescale-label-medium">{{ value }}</span>
    <span class="sr-only">{{ label }}</span>
  </span>
</template>

<style scoped>
.sc-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-stat--primary {
  color: var(--md-sys-color-primary);
}

.sc-stat--positive {
  color: var(--md-sys-color-tertiary);
}

.sc-stat--negative {
  color: var(--md-sys-color-error);
}
</style>
