<script setup lang="ts">
/**
 * Plugin icon with a deterministic gradient fallback, so a plugin without an
 * uploaded icon still gets a recognisable identity in the grid.
 */
import { computed, ref } from 'vue'
import { hashHue } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    src?: string | null
    name: string
    /** Rendered size in px. */
    size?: number
    /** Rounded-square (catalogue) or fully circular (author avatar). */
    round?: boolean
  }>(),
  { src: undefined, size: 64, round: false },
)

const failed = ref(false)
const showImage = computed(() => Boolean(props.src) && !failed.value)

const hue = computed(() => hashHue(props.name))
const fallbackStyle = computed(() => ({
  background: `linear-gradient(135deg, hsl(${hue.value} 70% 52%), hsl(${(hue.value + 38) % 360} 68% 38%))`,
}))

const letter = computed(() => (props.name.trim()[0] ?? 'S').toUpperCase())
</script>

<template>
  <span
    class="sc-plugin-icon"
    :class="{ 'sc-plugin-icon--round': round }"
    :style="{ width: size + 'px', height: size + 'px', fontSize: size * 0.42 + 'px' }"
    aria-hidden="true"
  >
    <img
      v-if="showImage"
      class="sc-plugin-icon__img"
      :src="src ?? undefined"
      :alt="`${name} 图标`"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    />
    <span v-else class="sc-plugin-icon__fallback" :style="fallbackStyle">{{ letter }}</span>
  </span>
</template>

<style scoped>
.sc-plugin-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-highest);
  color: #fff;
  user-select: none;
}

.sc-plugin-icon--round {
  border-radius: var(--md-sys-shape-corner-full);
}

.sc-plugin-icon__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sc-plugin-icon__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-weight: 600;
  line-height: 1;
}
</style>
