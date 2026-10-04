<script setup lang="ts">
import { computed } from 'vue'
import type { IconComponent } from '@/icons'
import M3Icon from './M3Icon.vue'

const props = withDefaults(
  defineProps<{
    label?: string
    supporting?: string
    icon?: IconComponent | null
    trailingText?: string
    href?: string
    target?: string
    rel?: string
    disabled?: boolean
    selected?: boolean
  }>(),
  {
    label: undefined,
    supporting: undefined,
    icon: null,
    trailingText: undefined,
    href: undefined,
    target: undefined,
    rel: undefined,
    disabled: false,
    selected: false,
  },
)

const tag = computed(() => (props.href ? 'a' : 'button'))
const isLink = computed(() => Boolean(props.href))
</script>

<template>
  <component
    :is="tag"
    v-ripple
    class="md-menu-item"
    :class="{ 'is-disabled': disabled, 'md-menu-item--two-line': supporting }"
    :href="href"
    :target="isLink ? target : undefined"
    :rel="isLink ? rel : undefined"
    :type="isLink ? undefined : 'button'"
    :disabled="!isLink && disabled ? true : undefined"
    role="menuitem"
    :tabindex="disabled ? -1 : 0"
    :aria-checked="selected ? 'true' : undefined"
  >
    <M3Icon v-if="icon" :icon="icon" :size="24" class="md-menu-item__icon" />
    <span class="md-menu-item__text">
      <span class="md-menu-item__label md-typescale-label-large"><slot>{{ label }}</slot></span>
      <span v-if="supporting" class="md-menu-item__supporting md-typescale-body-medium">{{ supporting }}</span>
    </span>
    <span v-if="trailingText" class="md-menu-item__trailing md-typescale-label-large">{{ trailingText }}</span>
  </component>
</template>

<style scoped>
.md-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding-inline: 12px;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  border-radius: var(--md-sys-shape-corner-extra-small);
}

.md-menu-item--two-line {
  min-height: 64px;
  align-items: flex-start;
  padding-block: 8px;
  border-radius: var(--md-sys-shape-corner-small);
}

.md-menu-item::after {
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
  .md-menu-item:hover::after {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}
.md-menu-item:focus-visible::after {
  opacity: var(--md-sys-state-focus-state-layer-opacity);
}

.md-menu-item__icon,
.md-menu-item__text,
.md-menu-item__trailing {
  position: relative;
  z-index: 3;
}

.md-menu-item__icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.md-menu-item--two-line .md-menu-item__icon {
  margin-block-start: 4px;
}

.md-menu-item__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.md-menu-item__supporting {
  color: var(--md-sys-color-on-surface-variant);
}

.md-menu-item__trailing {
  color: var(--md-sys-color-on-surface-variant);
}

.md-menu-item.is-disabled {
  pointer-events: none;
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
</style>
