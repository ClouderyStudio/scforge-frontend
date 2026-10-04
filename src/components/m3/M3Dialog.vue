<script setup lang="ts">
import { computed, ref } from 'vue'
import type { IconComponent } from '@/icons'
import { useModal } from '@/composables/useModal'
import M3Icon from './M3Icon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    /** Optional hero icon above the headline (MD3 "icon" dialog). */
    icon?: IconComponent | null
    /** Allow dismissal by scrim click or Escape. */
    dismissible?: boolean
    ariaLabel?: string
  }>(),
  { title: undefined, icon: null, dismissible: true, ariaLabel: undefined },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const panelRef = ref<HTMLElement | null>(null)
const isOpen = computed(() => props.modelValue)

useModal(isOpen, panelRef, {
  onClose: () => {
    if (props.dismissible) emit('update:modelValue', false)
  },
})
</script>

<template>
  <Teleport to="body">
    <Transition name="md-scrim">
      <div
        v-if="modelValue"
        class="md-scrim"
        @click="dismissible && emit('update:modelValue', false)"
      />
    </Transition>

    <Transition name="md-dialog-pop">
      <div
        v-if="modelValue"
        ref="panelRef"
        class="md-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel ?? title"
        tabindex="-1"
      >
        <div v-if="icon" class="md-dialog__icon">
          <M3Icon :icon="icon" :size="24" />
        </div>

        <h2 v-if="title" class="md-dialog__headline md-typescale-headline-small">{{ title }}</h2>

        <div class="md-dialog__body md-typescale-body-medium"><slot /></div>

        <div v-if="$slots.actions" class="md-dialog__actions"><slot name="actions" /></div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.md-dialog {
  position: fixed;
  z-index: 240;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  translate: -50% -50%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(560px, calc(100vw - 48px));
  min-width: min(280px, calc(100vw - 48px));
  max-height: calc(100dvh - 48px);
  padding: 24px;
  border-radius: var(--md-sys-shape-corner-extra-large);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level3);
  overflow: hidden;
}

.md-dialog__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-sys-color-secondary);
}

.md-dialog__headline {
  margin: 0;
  text-align: center;
}

.md-dialog__icon + .md-dialog__headline {
  margin-block-start: -8px;
}

.md-dialog__body {
  color: var(--md-sys-color-on-surface-variant);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.md-dialog__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 8px -8px -8px 0;
}

.md-dialog-pop-enter-active,
.md-dialog-pop-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate),
    translate var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate);
}

.md-dialog-pop-enter-from,
.md-dialog-pop-leave-to {
  opacity: 0;
  translate: -50% calc(-50% + 16px);
}
</style>
