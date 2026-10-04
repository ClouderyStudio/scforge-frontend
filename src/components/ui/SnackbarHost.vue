<script setup lang="ts">
import { IconCheckCircle, IconClose, IconWarning } from '@/icons'
import { M3Icon, M3IconButton } from '@/components/m3'
import { useSnackbar } from '@/composables/useSnackbar'

const { message, hide } = useSnackbar()
</script>

<template>
  <Teleport to="body">
    <Transition name="sc-snackbar">
      <div v-if="message" class="sc-snackbar" :class="'sc-snackbar--' + message.tone" role="status" aria-live="polite">
        <M3Icon
          :icon="message.tone === 'error' ? IconWarning : IconCheckCircle"
          :size="20"
          class="sc-snackbar__icon"
        />
        <span class="sc-snackbar__text md-typescale-body-medium">{{ message.text }}</span>
        <M3IconButton :icon="IconClose" label="关闭" size="sm" variant="standard" @click="hide" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sc-snackbar {
  position: fixed;
  z-index: 400;
  inset-block-end: 24px;
  inset-inline-start: 50%;
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(560px, calc(100vw - 32px));
  padding: 12px 8px 12px 16px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: var(--md-sys-elevation-level3);
}

.sc-snackbar__icon {
  color: var(--md-sys-color-inverse-primary);
  flex-shrink: 0;
}

.sc-snackbar--error .sc-snackbar__icon {
  color: var(--md-sys-color-error);
}

.sc-snackbar__text {
  flex: 1;
  min-width: 0;
}

.sc-snackbar :deep(.md-icon-btn) {
  color: inherit;
}

.sc-snackbar-enter-active,
.sc-snackbar-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate),
    translate var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate);
}

.sc-snackbar-enter-from,
.sc-snackbar-leave-to {
  opacity: 0;
  translate: -50% 20px;
}
</style>
