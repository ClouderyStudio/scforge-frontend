<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Tooltip text (plain tooltip, MD3). */
    text: string
    placement?: 'top' | 'bottom'
  }>(),
  { placement: 'top' },
)
</script>

<template>
  <span class="md-tooltip" :class="'md-tooltip--' + placement">
    <slot />
    <span class="md-tooltip__bubble" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.md-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.md-tooltip__bubble {
  position: absolute;
  z-index: 120;
  inset-inline-start: 50%;
  translate: -50% 0;
  max-width: 220px;
  padding: 4px 8px;
  border-radius: var(--md-sys-shape-corner-extra-small);
  background-color: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: var(--md-sys-typescale-body-small-line-height);
  letter-spacing: var(--md-sys-typescale-body-small-tracking);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    visibility 0s linear var(--md-sys-motion-duration-short4);
}

.md-tooltip--top .md-tooltip__bubble {
  inset-block-end: calc(100% + 8px);
}

.md-tooltip--bottom .md-tooltip__bubble {
  inset-block-start: calc(100% + 8px);
}

.md-tooltip:hover .md-tooltip__bubble,
.md-tooltip:focus-within .md-tooltip__bubble {
  opacity: 1;
  visibility: visible;
  transition-delay: 300ms, 300ms;
}
</style>
