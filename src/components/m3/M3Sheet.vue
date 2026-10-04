<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconClose } from '@/icons'
import { useModal } from '@/composables/useModal'
import M3IconButton from './M3IconButton.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** Edge the sheet is anchored to. */
    side?: 'start' | 'end' | 'bottom'
    /** Width (side sheets) or height (bottom sheet) as a CSS length. */
    size?: string
    title?: string
    /** Skip the built-in header and render the whole panel through the default slot. */
    bare?: boolean
    /** Hide the close button in the header. */
    hideClose?: boolean
  }>(),
  { side: 'start', size: '360px', title: undefined, bare: false, hideClose: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const panelRef = ref<HTMLElement | null>(null)
const isOpen = computed(() => props.modelValue)

useModal(isOpen, panelRef, { onClose: () => emit('update:modelValue', false) })

const panelStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (props.side === 'bottom') {
    style.height = 'auto'
    style.maxHeight = props.size
  } else {
    style.width = props.size
  }
  return style
})

const transitionName = computed(() => 'md-sheet-' + props.side)
</script>

<template>
  <Teleport to="body">
    <Transition name="md-scrim">
      <div v-if="modelValue" class="md-scrim" @click="emit('update:modelValue', false)" />
    </Transition>

    <Transition :name="transitionName">
      <div
        v-if="modelValue"
        ref="panelRef"
        class="md-sheet"
        :class="'md-sheet--' + side"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <header v-if="!bare" class="md-sheet__header">
          <h2 v-if="title" class="md-sheet__title md-typescale-title-large">{{ title }}</h2>
          <span v-else class="md-sheet__title" />
          <M3IconButton
            v-if="!hideClose"
            :icon="IconClose"
            label="关闭"
            variant="standard"
            @click="emit('update:modelValue', false)"
          />
        </header>

        <div class="md-sheet__body"><slot /></div>

        <footer v-if="$slots.footer" class="md-sheet__footer"><slot name="footer" /></footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.md-sheet {
  position: fixed;
  z-index: 220;
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level1);
  overflow: hidden;
}

.md-sheet--start {
  inset-block: 0;
  inset-inline-start: 0;
  border-start-end-radius: var(--md-sys-shape-corner-large);
  border-end-end-radius: var(--md-sys-shape-corner-large);
}

.md-sheet--end {
  inset-block: 0;
  inset-inline-end: 0;
  border-start-start-radius: var(--md-sys-shape-corner-large);
  border-end-start-radius: var(--md-sys-shape-corner-large);
}

.md-sheet--bottom {
  inset-inline: 0;
  inset-block-end: 0;
  border-start-start-radius: var(--md-sys-shape-corner-extra-large);
  border-start-end-radius: var(--md-sys-shape-corner-extra-large);
}

.md-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding-inline: 16px;
  padding-block: 8px;
  flex-shrink: 0;
}

.md-sheet__title {
  margin: 0;
}

.md-sheet__body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.md-sheet__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  flex-shrink: 0;
}

/* ---------- Transitions ---------- */
.md-sheet-start-enter-active,
.md-sheet-start-leave-active,
.md-sheet-end-enter-active,
.md-sheet-end-leave-active,
.md-sheet-bottom-enter-active,
.md-sheet-bottom-leave-active {
  transition: transform var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate);
}

.md-sheet-start-enter-from,
.md-sheet-start-leave-to {
  transform: translateX(-100%);
}
.md-sheet-end-enter-from,
.md-sheet-end-leave-to {
  transform: translateX(100%);
}
.md-sheet-bottom-enter-from,
.md-sheet-bottom-leave-to {
  transform: translateY(100%);
}
</style>
