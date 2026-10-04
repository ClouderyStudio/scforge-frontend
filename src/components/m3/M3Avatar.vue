<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    /** Accessible name; also used to derive fallback initials. */
    name?: string
    alt?: string
    /** Diameter in px or any CSS length. */
    size?: number | string
    /** Adds an outline ring, used for emphasis in member grids. */
    ring?: boolean
  }>(),
  { src: undefined, name: '', alt: undefined, size: 40, ring: false },
)

const failed = ref(false)
const loaded = ref(false)
const imageEl = ref<HTMLImageElement | null>(null)

const cssSize = computed(() => (typeof props.size === 'number' ? props.size + 'px' : props.size))

const initials = computed(() => {
  const source = (props.name ?? '').trim()
  if (!source) return '?'
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
})

const showImage = computed(() => Boolean(props.src) && !failed.value)

onMounted(() => {
  // Cached images can fire load before the listener is attached.
  if (imageEl.value?.complete) loaded.value = true
})
</script>

<template>
  <span
    class="md-avatar"
    :class="{ 'md-avatar--ring': ring }"
    :style="{ width: cssSize, height: cssSize, fontSize: 'calc(' + cssSize + ' * 0.36)' }"
  >
    <img
      v-if="showImage"
      ref="imageEl"
      class="md-avatar__img"
      :class="{ 'is-loaded': loaded }"
      :src="src"
      :alt="alt ?? name ?? ''"
      loading="lazy"
      decoding="async"
      @load="loaded = true"
      @error="failed = true"
    />
    <span v-else class="md-avatar__initials" aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<style scoped>
.md-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--md-sys-shape-corner-full);
  overflow: hidden;
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-weight: var(--md-sys-typescale-title-medium-weight);
  line-height: 1;
  user-select: none;
}

.md-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-standard);
}

.md-avatar__img.is-loaded {
  opacity: 1;
}

.md-avatar--ring {
  box-shadow:
    0 0 0 2px var(--md-sys-color-surface),
    0 0 0 4px var(--md-sys-color-primary-container);
}
</style>
