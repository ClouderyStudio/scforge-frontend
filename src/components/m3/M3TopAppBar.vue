<script setup lang="ts">
withDefaults(
  defineProps<{
    /** True once the page is scrolled: switches the bar to the container colour. */
    scrolled?: boolean
    /** Force the elevated/scrolled treatment regardless of scroll position. */
    elevated?: boolean
    /** Small (64dp) is the default; medium (112dp) and large (152dp) stack the title. */
    size?: 'small' | 'medium' | 'large'
    /** Centre the title. */
    centered?: boolean
    /** Stick to the top of the viewport. */
    sticky?: boolean
    /** Paint no surface of its own so the page shows through; use the `background` slot. */
    overlay?: boolean
  }>(),
  { scrolled: false, elevated: false, size: 'small', centered: false, sticky: true, overlay: false },
)
</script>

<template>
  <header
    class="md-top-bar"
    :class="[
      'md-top-bar--' + size,
      {
        'is-scrolled': scrolled || elevated,
        'md-top-bar--centered': centered,
        'md-top-bar--sticky': sticky,
        'md-top-bar--overlay': overlay,
      },
    ]"
  >
    <div class="md-top-bar__background" aria-hidden="true"><slot name="background" /></div>

    <div class="md-top-bar__inner md-container">
      <div class="md-top-bar__leading"><slot name="leading" /></div>
      <div class="md-top-bar__title"><slot /></div>
      <div class="md-top-bar__actions"><slot name="actions" /></div>
    </div>
  </header>
</template>

<style scoped>
.md-top-bar {
  position: relative;
  z-index: 50;
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  transition:
    background-color var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
}

.md-top-bar--sticky {
  position: sticky;
  inset-block-start: 0;
}

.md-top-bar.is-scrolled {
  background-color: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level2);
}

/* Overlay: the bar itself paints nothing — the consumer draws the surface in the
   `background` slot (the site header's floating glass pill). */
.md-top-bar--overlay,
.md-top-bar--overlay.is-scrolled {
  background-color: transparent;
  box-shadow: none;
}

.md-top-bar__background {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.md-top-bar__inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--md-sys-top-app-bar-height);
}

.md-top-bar--medium .md-top-bar__inner {
  min-height: 112px;
  align-items: flex-end;
  padding-block-end: 20px;
}

.md-top-bar--large .md-top-bar__inner {
  min-height: 152px;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  gap: 0;
  padding-block-end: 28px;
}

.md-top-bar--large .md-top-bar__title {
  order: 3;
  margin-block-start: 8px;
}

.md-top-bar--large .md-top-bar__actions {
  order: 2;
  align-self: flex-end;
}

.md-top-bar__leading,
.md-top-bar__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.md-top-bar__title {
  flex: 1;
  min-width: 0;
  font-size: var(--md-sys-typescale-title-large-size);
  line-height: var(--md-sys-typescale-title-large-line-height);
  font-weight: var(--md-sys-typescale-title-large-weight);
  letter-spacing: var(--md-sys-typescale-title-large-tracking);
}

.md-top-bar--large .md-top-bar__title {
  font-size: var(--md-sys-typescale-headline-medium-size);
  line-height: var(--md-sys-typescale-headline-medium-line-height);
}

.md-top-bar--centered .md-top-bar__title {
  text-align: center;
}
</style>
