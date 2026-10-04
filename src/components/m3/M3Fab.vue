<script setup lang="ts">
import { computed } from 'vue'
import type { IconComponent } from '@/icons'
import M3Icon from './M3Icon.vue'

type FabVariant =
  | 'surface'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container'

const props = withDefaults(
  defineProps<{
    icon: IconComponent
    /** MD3 FAB size: 40dp small / 56dp regular / 96dp large. */
    size?: 'sm' | 'md' | 'lg'
    variant?: FabVariant
    /** Extended FAB: icon plus a text label. */
    label?: string
    /** Pin to the bottom-end corner of the viewport. */
    fixed?: boolean
    colored?: boolean
    href?: string
    target?: string
    rel?: string
    type?: 'button' | 'submit' | 'reset'
    ariaLabel?: string
  }>(),
  {
    size: 'md',
    variant: 'primary-container',
    label: undefined,
    fixed: false,
    colored: true,
    href: undefined,
    target: undefined,
    rel: undefined,
    type: 'button',
    ariaLabel: undefined,
  },
)

const tag = computed(() => (props.href ? 'a' : 'button'))
const isLink = computed(() => Boolean(props.href))
const glyphSize = computed(() => (props.size === 'lg' ? 36 : 24))
const extended = computed(() => typeof props.label === 'string' && props.label.length > 0)
</script>

<template>
  <component
    :is="tag"
    v-ripple
    class="md-fab"
    :class="[
      'md-fab--' + size,
      'md-fab--' + variant,
      { 'md-fab--extended': extended, 'md-fab--fixed': fixed, 'md-fab--flat': !colored },
    ]"
    :href="href"
    :target="isLink ? target : undefined"
    :rel="isLink ? rel : undefined"
    :type="isLink ? undefined : type"
    :aria-label="extended ? undefined : (ariaLabel ?? '操作')"
  >
    <M3Icon :icon="icon" :size="glyphSize" class="md-fab__icon" />
    <span v-if="extended" class="md-fab__label">{{ label }}</span>
  </component>
</template>

<style scoped>
.md-fab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: var(--md-sys-elevation-level3);
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  padding: 0;
  transition:
    box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.md-fab::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

@media (hover: hover) {
  .md-fab:hover {
    box-shadow: var(--md-sys-elevation-level4);
  }
  .md-fab:hover::after {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}
.md-fab:active::after {
  opacity: var(--md-sys-state-pressed-state-layer-opacity);
}

.md-fab__icon,
.md-fab__label {
  position: relative;
  z-index: 3;
}

.md-fab--sm {
  width: 40px;
  height: 40px;
  border-radius: var(--md-sys-shape-corner-medium);
}
.md-fab--md {
  width: 56px;
  height: 56px;
}
.md-fab--lg {
  width: 96px;
  height: 96px;
  border-radius: var(--md-sys-shape-corner-extra-large);
}

.md-fab--extended {
  width: auto;
  padding-inline: 20px;
  height: 56px;
  border-radius: var(--md-sys-shape-corner-large);
}

.md-fab__label {
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  white-space: nowrap;
}

/* ---------- Colour sets ---------- */
.md-fab--surface {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
}
.md-fab--primary {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.md-fab--secondary {
  background-color: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}
.md-fab--tertiary {
  background-color: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
}
.md-fab--secondary-container {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.md-fab--tertiary-container {
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.md-fab--flat {
  box-shadow: none;
}

.md-fab--fixed {
  position: fixed;
  inset-block-end: 24px;
  inset-inline-end: 24px;
  z-index: 60;
}
</style>
