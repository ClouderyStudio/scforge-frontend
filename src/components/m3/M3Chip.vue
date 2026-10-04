<script setup lang="ts">
import { IconCheck, IconClose, type IconComponent } from '@/icons'
import M3Icon from './M3Icon.vue'

const props = withDefaults(
  defineProps<{
    /** Chip text. */
    label: string
    /** MD3 chip type. */
    variant?: 'assist' | 'filter' | 'input'
    /** Filter chips toggle; selected chips get the checkmark and a tonal container. */
    selected?: boolean
    icon?: IconComponent | null
    disabled?: boolean
    /** Render as a pressed toggle button (filter/input chips). */
    toggle?: boolean
  }>(),
  {
    variant: 'assist',
    selected: false,
    icon: null,
    disabled: false,
    toggle: false,
  },
)

const emit = defineEmits<{ (e: 'remove'): void }>()

const isToggle = props.variant === 'filter' || props.toggle
</script>

<template>
  <button
    v-ripple
    type="button"
    class="md-chip"
    :class="['md-chip--' + variant, { 'is-selected': selected, 'is-disabled': disabled }]"
    :disabled="disabled"
    :aria-pressed="isToggle ? selected : undefined"
  >
    <M3Icon
      v-if="selected && isToggle"
      :icon="IconCheck"
      :size="18"
      class="md-chip__icon md-chip__icon--check"
    />
    <M3Icon v-else-if="icon" :icon="icon" :size="18" class="md-chip__icon" />
    <span class="md-chip__label">{{ label }}</span>
    <span
      v-if="variant === 'input'"
      class="md-chip__trailing"
      role="button"
      tabindex="0"
      aria-label="移除"
      @click.stop="emit('remove')"
      @keydown.enter.stop.prevent="emit('remove')"
      @keydown.space.stop.prevent="emit('remove')"
    >
      <M3Icon :icon="IconClose" :size="18" />
    </span>
  </button>
</template>

<style scoped>
.md-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding-inline: 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  line-height: var(--md-sys-typescale-label-large-line-height);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
  transition:
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.md-chip::after {
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
  .md-chip:hover::after {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}
.md-chip:focus-visible::after {
  opacity: var(--md-sys-state-focus-state-layer-opacity);
}
.md-chip:active::after {
  opacity: var(--md-sys-state-pressed-state-layer-opacity);
}

.md-chip__label,
.md-chip__icon,
.md-chip__trailing {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
}

.md-chip.is-selected {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  box-shadow: none;
}

.md-chip__icon--check {
  margin-inline-start: -4px;
}

.md-chip__trailing {
  margin-inline-end: -4px;
  cursor: pointer;
}

.md-chip.is-disabled {
  pointer-events: none;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
.md-chip.is-disabled.is-selected {
  background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
</style>