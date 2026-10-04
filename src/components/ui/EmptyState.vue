<script setup lang="ts">
import { M3Button, M3Icon } from '@/components/m3'
import { IconSearch, type IconComponent } from '@/icons'

withDefaults(
  defineProps<{
    icon?: IconComponent
    title: string
    description?: string
    actionLabel?: string
    actionTo?: unknown
  }>(),
  { icon: undefined, description: undefined, actionLabel: undefined, actionTo: undefined },
)

const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <div class="sc-empty">
    <span class="sc-empty__icon">
      <M3Icon :icon="icon ?? IconSearch" :size="32" />
    </span>
    <p class="sc-empty__title md-typescale-title-medium">{{ title }}</p>
    <p v-if="description" class="sc-empty__description md-typescale-body-medium">{{ description }}</p>
    <M3Button v-if="actionLabel" class="sc-empty__action" variant="tonal" size="sm" @click="emit('action')">
      {{ actionLabel }}
    </M3Button>
  </div>
</template>

<style scoped>
.sc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 24px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  text-align: center;
}

.sc-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-block-end: 4px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-empty__title {
  font-weight: var(--md-typescale-title-medium-weight);
}

.sc-empty__description {
  max-width: 46ch;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-empty__action {
  margin-block-start: 8px;
}
</style>
