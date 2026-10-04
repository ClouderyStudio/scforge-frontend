<script setup lang="ts">
import { computed } from 'vue'
import type { IconComponent } from '@/icons'
import M3Icon from './M3Icon.vue'

type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'
type IconButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    icon: IconComponent
    /** Variant to use when the button is toggled on. Defaults to a filled emphasis. */
    selectedIcon?: IconComponent | null
    variant?: IconButtonVariant
    size?: IconButtonSize
    /** Accessible name — required, since the button has no visible label. */
    label: string
    selected?: boolean
    disabled?: boolean
    href?: string
    target?: string
    rel?: string
    type?: 'button' | 'submit' | 'reset'
    /** Circular hit area is the default; 'square' is used for dense app bars. */
    shape?: 'full' | 'small' | 'medium'
  }>(),
  {
    selectedIcon: null,
    variant: 'standard',
    size: 'md',
    selected: false,
    disabled: false,
    href: undefined,
    target: undefined,
    rel: undefined,
    type: 'button',
    shape: 'full',
  },
)

const tag = computed(() => (props.href ? 'a' : 'button'))
const isLink = computed(() => Boolean(props.href))
const glyph = computed(() => {
  if (props.selected && props.selectedIcon) return props.selectedIcon
  return props.icon
})
const glyphSize = computed(() => (props.size === 'lg' ? 24 : props.size === 'sm' ? 18 : 24))
const effectiveVariant = computed(() => (props.selected && props.variant === 'standard' ? 'tonal' : props.variant))
</script>

<template>
  <component
    :is="tag"
    v-ripple
    class="md-icon-btn"
    :class="[
      'md-icon-btn--' + effectiveVariant,
      'md-icon-btn--' + size,
      'md-icon-btn--shape-' + shape,
      { 'is-selected': selected, 'is-disabled': disabled },
    ]"
    :href="href"
    :target="isLink ? target : undefined"
    :rel="isLink ? rel : undefined"
    :type="isLink ? undefined : type"
    :disabled="!isLink && disabled ? true : undefined"
    :aria-label="label"
    :aria-pressed="selectedIcon ? selected : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :tabindex="disabled && isLink ? -1 : undefined"
    :title="label"
  >
    <M3Icon :icon="glyph" :size="glyphSize" />
  </component>
</template>

<style scoped>
.md-icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  width: 40px;
  flex-shrink: 0;
  border: none;
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition:
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    height var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized),
    width var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized);
}

.md-icon-btn--shape-full {
  border-radius: var(--md-sys-shape-corner-full);
}
.md-icon-btn--shape-small {
  border-radius: var(--md-sys-shape-corner-small);
}
.md-icon-btn--shape-medium {
  border-radius: var(--md-sys-shape-corner-medium);
}

.md-icon-btn::after {
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
  .md-icon-btn:hover::after {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}
.md-icon-btn:focus-visible::after {
  opacity: var(--md-sys-state-focus-state-layer-opacity);
}
.md-icon-btn:active::after {
  opacity: var(--md-sys-state-pressed-state-layer-opacity);
}

.md-icon-btn > :deep(*) {
  position: relative;
  z-index: 3;
}

/* ---------- Variants ---------- */
.md-icon-btn--standard {
  color: var(--md-sys-color-on-surface-variant);
}
.md-icon-btn--standard.is-selected {
  color: var(--md-sys-color-primary);
}
.md-icon-btn--filled {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.md-icon-btn--tonal {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.md-icon-btn--outlined {
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
}
.md-icon-btn--outlined.is-selected {
  background-color: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: none;
}

/* ---------- Sizes ---------- */
.md-icon-btn--sm {
  height: 32px;
  width: 32px;
}
.md-icon-btn--lg {
  height: 48px;
  width: 48px;
}

.is-disabled {
  pointer-events: none;
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
.md-icon-btn--filled.is-disabled,
.md-icon-btn--tonal.is-disabled {
  background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
</style>
