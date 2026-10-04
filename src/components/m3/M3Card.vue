<script setup lang="ts">
withDefaults(
  defineProps<{
    /** MD3 card emphasis: elevated, filled or outlined. */
    variant?: 'elevated' | 'filled' | 'outlined'
    /** Adds hover/press elevation and pointer affordance. */
    interactive?: boolean
    /** Corner radius override; 'large' matches the M3 card default of 12dp. */
    shape?: 'medium' | 'large' | 'extra-large'
    href?: string
    target?: string
    rel?: string
  }>(),
  {
    variant: 'elevated',
    interactive: false,
    shape: 'medium',
    href: undefined,
    target: undefined,
    rel: undefined,
  },
)
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    class="md-card"
    :class="['md-card--' + variant, 'md-card--shape-' + shape, { 'md-card--interactive': interactive }]"
    :href="href"
    :target="href ? target : undefined"
    :rel="href ? rel : undefined"
  >
    <div v-if="$slots.media" class="md-card__media"><slot name="media" /></div>
    <div class="md-card__content"><slot /></div>
    <div v-if="$slots.actions" class="md-card__actions"><slot name="actions" /></div>
  </component>
</template>

<style scoped>
.md-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  text-decoration: none;
  transition:
    box-shadow var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard),
    background-color var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized);
}

.md-card--shape-medium {
  border-radius: var(--md-sys-shape-corner-medium);
}
.md-card--shape-large {
  border-radius: var(--md-sys-shape-corner-large);
}
.md-card--shape-extra-large {
  border-radius: var(--md-sys-shape-corner-extra-large);
}

.md-card--elevated {
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: var(--md-sys-elevation-level1);
}
.md-card--filled {
  background-color: var(--md-sys-color-surface-container-highest);
  box-shadow: none;
}
.md-card--outlined {
  background-color: var(--md-sys-color-surface);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.md-card--interactive {
  cursor: pointer;
}

@media (hover: hover) {
  .md-card--interactive.md-card--elevated:hover {
    box-shadow: var(--md-sys-elevation-level2);
  }
  .md-card--interactive.md-card--filled:hover,
  .md-card--interactive.md-card--outlined:hover {
    box-shadow: var(--md-sys-elevation-level1);
  }
  .md-card--interactive:hover {
    transform: translateY(-4px);
  }
}

.md-card__media {
  display: block;
  flex-shrink: 0;
}

.md-card__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  flex: 1;
}

.md-card:not(:has(.md-card__media)) .md-card__content {
  padding-block-start: 16px;
}

.md-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 16px;
}
</style>
