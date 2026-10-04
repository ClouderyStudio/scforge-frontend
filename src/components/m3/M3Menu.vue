<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Which edge of the trigger the panel aligns to. */
    placement?: 'bottom-start' | 'bottom-end' | 'bottom'
    /** Distance between trigger and panel. */
    gap?: number
    minWidth?: number
    maxWidth?: number
    /** Stretch the panel to the trigger width (used by navigation panels). */
    matchTriggerWidth?: boolean
    /** MD3 menus carry 8dp vertical padding; large navigation panels turn it off. */
    padded?: boolean
    /** Close after activating an item inside the panel. */
    closeOnSelect?: boolean
    /** Close on page scroll instead of tracking the trigger. */
    closeOnScroll?: boolean
  }>(),
  {
    placement: 'bottom-start',
    gap: 4,
    minWidth: 112,
    maxWidth: 720,
    matchTriggerWidth: false,
    padded: true,
    closeOnSelect: true,
    closeOnScroll: false,
  },
)

const open = ref(false)
const anchorRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({ top: '0px', left: '0px', minWidth: '112px' })

function updatePosition(): void {
  const anchor = anchorRef.value
  if (!anchor) return
  const rect = anchor.getBoundingClientRect()
  const panel = panelRef.value
  const panelWidth = panel ? panel.offsetWidth : props.minWidth
  const panelHeight = panel ? panel.offsetHeight : 0
  const pad = 8

  let left = rect.left
  if (props.placement === 'bottom-end') left = rect.right - panelWidth
  else if (props.placement === 'bottom') left = rect.left + rect.width / 2 - panelWidth / 2
  left = Math.min(Math.max(left, pad), Math.max(pad, window.innerWidth - panelWidth - pad))

  let top = rect.bottom + props.gap
  const overflowsBelow = panelHeight > 0 && top + panelHeight > window.innerHeight - pad
  const fitsAbove = rect.top - props.gap - panelHeight > pad
  if (overflowsBelow && fitsAbove) top = rect.top - props.gap - panelHeight

  panelStyle.value = {
    top: top + 'px',
    left: left + 'px',
    minWidth: (props.matchTriggerWidth ? rect.width : props.minWidth) + 'px',
  }
}

function close(): void {
  open.value = false
}

function toggle(): void {
  open.value = !open.value
}

function onDocumentPointerDown(event: PointerEvent): void {
  const target = event.target as Node | null
  if (!target) return
  if (panelRef.value?.contains(target) || anchorRef.value?.contains(target)) return
  close()
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !open.value) return
  close()
  const trigger = anchorRef.value?.querySelector<HTMLElement>('button, a')
  trigger?.focus()
}

function onScroll(): void {
  if (props.closeOnScroll) close()
  else updatePosition()
}

function onPanelClick(event: MouseEvent): void {
  if (!props.closeOnSelect) return
  const target = event.target as HTMLElement | null
  if (target?.closest('a, button, [role="menuitem"]')) close()
}

watch(open, async (value) => {
  if (value) {
    await nextTick()
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
    document.addEventListener('keydown', onDocumentKeydown)
  } else {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', onScroll, true)
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
    document.removeEventListener('keydown', onDocumentKeydown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', onScroll, true)
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeydown)
})

defineExpose({ open, close, toggle })
</script>

<template>
  <span ref="anchorRef" class="md-menu-anchor" @click="toggle">
    <slot name="trigger" :open="open" :toggle="toggle" :close="close" />
  </span>

  <Teleport to="body">
    <Transition name="md-menu-pop">
      <div
        v-if="open"
        ref="panelRef"
        class="md-menu"
        :class="{ 'md-menu--padded': padded }"
        role="menu"
        :style="{ ...panelStyle, maxWidth: 'min(calc(100vw - 16px), ' + maxWidth + 'px)' }"
        @click="onPanelClick"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.md-menu-anchor {
  display: inline-flex;
  align-items: center;
}

.md-menu {
  position: fixed;
  z-index: 300;
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  border-radius: var(--md-sys-shape-corner-extra-small);
  box-shadow: var(--md-sys-elevation-level2);
  max-height: calc(100vh - 96px);
  overflow: hidden auto;
  overscroll-behavior: contain;
}

.md-menu--padded {
  padding-block: 8px;
}

.md-menu-pop-enter-active,
.md-menu-pop-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate),
    transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate);
  transform-origin: top center;
}

.md-menu-pop-enter-from,
.md-menu-pop-leave-to {
  opacity: 0;
  transform: scaleY(0.85) translateY(-4px);
}
</style>
