<script setup lang="ts">
import { computed } from 'vue'
import type { IconComponent } from '@/icons'
import M3Icon from './M3Icon.vue'

type ButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    /** MD3 button emphasis level. */
    variant?: ButtonVariant
    /** MD3 button height: 32dp / 40dp / 56dp (extra large). */
    size?: ButtonSize
    /** Optional leading icon. */
    icon?: IconComponent | null
    /** Optional trailing icon. */
    trailingIcon?: IconComponent | null
    disabled?: boolean
    /** Renders an anchor instead of a button. */
    href?: string
    target?: string
    rel?: string
    /** Native button type; ignored when href is set. */
    type?: 'button' | 'submit' | 'reset'
    /** Stretch to the container width. */
    block?: boolean
  }>(),
  {
    variant: 'filled',
    size: 'md',
    icon: null,
    trailingIcon: null,
    disabled: false,
    href: undefined,
    target: undefined,
    rel: undefined,
    type: 'button',
    block: false,
  },
)

const tag = computed(() => (props.href ? 'a' : 'button'))
const glyphSize = computed(() => (props.size === 'lg' ? 24 : 18))
const isLink = computed(() => Boolean(props.href))
</script>

<template>
  <component
    :is="tag"
    v-ripple
    class="md-btn"
    :class="[
      'md-btn--' + variant,
      'md-btn--' + size,
      { 'md-btn--block': block, 'is-disabled': disabled },
    ]"
    :href="href"
    :target="isLink ? target : undefined"
    :rel="isLink ? rel : undefined"
    :type="isLink ? undefined : type"
    :disabled="!isLink && disabled ? true : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :tabindex="disabled && isLink ? -1 : undefined"
  >
    <M3Icon v-if="icon" :icon="icon" :size="glyphSize" class="md-btn__icon" />
    <span class="md-btn__label"><slot /></span>
    <M3Icon v-if="trailingIcon" :icon="trailingIcon" :size="glyphSize" class="md-btn__icon" />
  </component>
</template>

<style scoped>
.md-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: transparent;
  color: var(--md-sys-color-primary);
  font-family: var(--md-ref-typeface-plain);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  line-height: var(--md-sys-typescale-label-large-line-height);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  padding-inline: 24px;
  height: 40px;
  transition:
    box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    height var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized),
    padding-inline var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized);
}

/* State layer, painted under the label so text stays crisp. */
.md-btn::after {
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
  .md-btn:hover::after {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}

.md-btn:focus-visible::after {
  opacity: var(--md-sys-state-focus-state-layer-opacity);
}

.md-btn:active::after {
  opacity: var(--md-sys-state-pressed-state-layer-opacity);
}

.md-btn__icon,
.md-btn__label {
  position: relative;
  z-index: 3;
}

/* ---------- Variants ---------- */
.md-btn--filled {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.md-btn--tonal {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.md-btn--elevated {
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-primary);
  box-shadow: var(--md-sys-elevation-level1);
}
.md-btn--outlined {
  color: var(--md-sys-color-primary);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
}
.md-btn--text {
  color: var(--md-sys-color-primary);
  padding-inline: 12px;
}

@media (hover: hover) {
  .md-btn--filled:hover,
  .md-btn--tonal:hover {
    box-shadow: var(--md-sys-elevation-level1);
  }
  .md-btn--elevated:hover {
    box-shadow: var(--md-sys-elevation-level2);
  }
}

/* ---------- Sizes ---------- */
.md-btn--sm {
  height: 32px;
  padding-inline: 16px;
}
.md-btn--sm.md-btn--text {
  padding-inline: 8px;
}
.md-btn--lg {
  height: 56px;
  padding-inline: 32px;
}

.md-btn--block {
  display: flex;
  width: 100%;
}

.is-disabled {
  pointer-events: none;
  box-shadow: none;
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
.md-btn--filled.is-disabled,
.md-btn--tonal.is-disabled,
.md-btn--elevated.is-disabled {
  background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
.md-btn--outlined.is-disabled {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
}
</style>
