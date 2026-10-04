<script setup lang="ts">
import { computed } from 'vue'
import type { IconComponent } from '@/icons'
import M3Icon from './M3Icon.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Primary text. Can also come from the default slot. */
    headline?: string
    /** Secondary text under the headline. */
    supporting?: string
    leadingIcon?: IconComponent | null
    /** Renders an anchor; the item becomes navigable. */
    href?: string
    target?: string
    rel?: string
    /** Renders a button; the item becomes actionable. */
    clickable?: boolean
    selected?: boolean
    disabled?: boolean
    /** MD3 list item height: one-line 56dp, two-line 72dp, three-line 88dp. */
    lines?: 1 | 2 | 3
    /** Extra leading/trailing padding, used inside sheets. */
    padded?: boolean
  }>(),
  {
    headline: undefined,
    supporting: undefined,
    leadingIcon: null,
    href: undefined,
    target: undefined,
    rel: undefined,
    clickable: false,
    selected: false,
    disabled: false,
    lines: undefined,
    padded: false,
  },
)

const tag = computed(() => {
  if (props.href) return 'a'
  if (props.clickable) return 'button'
  return 'div'
})
const isLink = computed(() => Boolean(props.href))
</script>

<template>
  <li class="md-list-item__wrap">
    <component
      :is="tag"
      v-ripple
      v-bind="$attrs"
      class="md-list-item"
      :class="[
        'md-list-item--lines-' + (lines ?? (supporting ? 2 : 1)),
        { 'is-selected': selected, 'is-disabled': disabled, 'md-list-item--padded': padded },
      ]"
      :href="href"
      :target="isLink ? target : undefined"
      :rel="isLink ? rel : undefined"
      :type="!isLink && clickable ? 'button' : undefined"
      :disabled="!isLink && clickable && disabled ? true : undefined"
      :aria-current="selected ? 'true' : undefined"
      :aria-disabled="disabled ? 'true' : undefined"
      :tabindex="disabled && isLink ? -1 : undefined"
    >
      <span v-if="leadingIcon || $slots.leading" class="md-list-item__leading">
        <slot name="leading"><M3Icon v-if="leadingIcon" :icon="leadingIcon" :size="24" /></slot>
      </span>

      <span class="md-list-item__text">
        <span class="md-list-item__headline md-typescale-body-large">
          <slot>{{ headline }}</slot>
        </span>
        <span v-if="supporting || $slots.supporting" class="md-list-item__supporting md-typescale-body-medium">
          <slot name="supporting">{{ supporting }}</slot>
        </span>
      </span>

      <span v-if="$slots.trailing" class="md-list-item__trailing"><slot name="trailing" /></span>
    </component>
  </li>
</template>

<style scoped>
.md-list-item__wrap {
  display: block;
  margin: 0;
}

.md-list-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding-inline: 16px;
  border: none;
  background-color: transparent;
  color: var(--md-sys-color-on-surface);
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.md-list-item--lines-1 {
  min-height: 56px;
}
.md-list-item--lines-2 {
  min-height: 72px;
  align-items: flex-start;
  padding-block: 12px;
}
.md-list-item--lines-3 {
  min-height: 88px;
  align-items: flex-start;
  padding-block: 12px;
}

.md-list-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

@media (hover: hover) {
  .md-list-item:hover::after {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}
.md-list-item:focus-visible::after {
  opacity: var(--md-sys-state-focus-state-layer-opacity);
}
.md-list-item:active::after {
  opacity: var(--md-sys-state-pressed-state-layer-opacity);
}

.md-list-item__leading,
.md-list-item__text,
.md-list-item__trailing {
  position: relative;
  z-index: 3;
}

.md-list-item__leading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.md-list-item--lines-2 .md-list-item__leading,
.md-list-item--lines-3 .md-list-item__leading {
  margin-block-start: 4px;
}

.md-list-item__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.md-list-item__headline {
  overflow: hidden;
  text-overflow: ellipsis;
}

.md-list-item__supporting {
  color: var(--md-sys-color-on-surface-variant);
}

.md-list-item__trailing {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.md-list-item.is-selected {
  color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-secondary-container);
}

.md-list-item-padded {
  padding-inline: 24px;
}

.md-list-item.is-disabled {
  pointer-events: none;
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}
</style>
