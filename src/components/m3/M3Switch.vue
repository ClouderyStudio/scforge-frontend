<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** Accessible name — the visible label usually lives next to the switch. */
    label?: string
    disabled?: boolean
  }>(),
  { label: undefined, disabled: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

function toggle(): void {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    class="md-switch"
    :class="{ 'is-checked': modelValue, 'is-disabled': disabled }"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="md-switch__track">
      <span class="md-switch__state"></span>
      <span class="md-switch__thumb">
        <span v-if="modelValue" class="md-switch__thumb-icon">
          <slot name="on-icon" />
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.md-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 32px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  flex-shrink: 0;
}

.md-switch__track {
  position: relative;
  display: block;
  width: 52px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-highest);
  box-shadow: inset 0 0 0 2px var(--md-sys-color-outline);
  transition:
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.md-switch__state {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: currentColor;
  color: var(--md-sys-color-on-surface);
  opacity: 0;
  transition:
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    inset var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized);
}

@media (hover: hover) {
  .md-switch:hover .md-switch__state {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}
.md-switch:focus-visible .md-switch__state {
  opacity: var(--md-sys-state-focus-state-layer-opacity);
}
.md-switch:active .md-switch__state {
  opacity: var(--md-sys-state-pressed-state-layer-opacity);
  inset: -4px;
}

.md-switch__thumb {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 6px;
  translate: 0 -50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-outline);
  color: var(--md-sys-color-on-primary-container);
  transition:
    inset-inline-start var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized),
    width var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized),
    height var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized),
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.md-switch__thumb-icon {
  display: flex;
  font-size: 16px;
}

.md-switch.is-checked .md-switch__track {
  background-color: var(--md-sys-color-primary);
  box-shadow: none;
}

.md-switch.is-checked .md-switch__state {
  color: var(--md-sys-color-primary);
}

.md-switch.is-checked .md-switch__thumb {
  inset-inline-start: 24px;
  width: 24px;
  height: 24px;
  background-color: var(--md-sys-color-on-primary);
}

.md-switch.is-disabled {
  pointer-events: none;
  opacity: var(--md-sys-state-disabled-content-opacity);
}
</style>
