<script setup lang="ts">
import { computed } from 'vue'
import type { IconComponent } from '@/icons'

const props = withDefaults(
  defineProps<{
    /** An icon component from '@/icons'. */
    icon?: IconComponent | null
    /** Rendered size in px (or any CSS length). MD3 default glyph size is 24dp. */
    size?: number | string
    /** Accessible name. When omitted the icon is decorative and hidden from AT. */
    label?: string
  }>(),
  { icon: null, size: 24, label: undefined },
)

const cssSize = computed(() => (typeof props.size === 'number' ? props.size + 'px' : props.size))
</script>

<template>
  <span
    class="md-icon"
    :style="{ fontSize: cssSize }"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <component :is="icon" v-if="icon" class="md-icon__svg" />
    <slot v-else />
  </span>
</template>

<style scoped>
.md-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  color: inherit;
}

.md-icon :deep(svg) {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
</style>
