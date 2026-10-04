<script setup lang="ts">
import { IconCheck, type IconComponent } from '@/icons'
import M3Icon from './M3Icon.vue'

export interface SegmentedOption {
  value: string
  label: string
  icon?: IconComponent
}

withDefaults(
  defineProps<{
    options: SegmentedOption[]
    /** Selected value (single-select). */
    modelValue: string
    /** Full-width segments instead of content-width. */
    block?: boolean
    ariaLabel?: string
  }>(),
  { block: false, ariaLabel: undefined },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div
    class="md-segmented"
    :class="{ 'md-segmented--block': block }"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="option.value"
      v-ripple
      type="button"
      role="radio"
      class="md-segmented__item"
      :class="{ 'is-selected': option.value === modelValue }"
      :aria-checked="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
    >
      <M3Icon v-if="option.value === modelValue" :icon="IconCheck" :size="18" class="md-segmented__check" />
      <M3Icon v-else-if="option.icon" :icon="option.icon" :size="18" class="md-segmented__check" />
      <span class="md-segmented__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.md-segmented {
  display: inline-flex;
  align-items: stretch;
  border-radius: var(--md-sys-shape-corner-full);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
  height: 40px;
}

.md-segmented--block {
  display: flex;
  width: 100%;
}

.md-segmented__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  /* 按内容取宽。原来的 flex:1（basis 0）会把各段强行等分，标签长的那一段因此被
     挤掉几个像素（后台「全部 / 待审核 / 已发布」实测切掉 7px）。只有 block 变体
     才需要均分，见下面的覆盖规则。 */
  flex: 0 1 auto;
  padding-inline: 16px;
  border: none;
  background-color: transparent;
  color: var(--md-sys-color-on-surface);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

/* 通栏变体：均分段宽以填满容器。 */
.md-segmented--block .md-segmented__item {
  flex: 1 1 0;
}

.md-segmented__item + .md-segmented__item {
  box-shadow: inset 1px 0 0 0 var(--md-sys-color-outline);
}

.md-segmented__item::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

@media (hover: hover) {
  .md-segmented__item:hover::after {
    opacity: var(--md-sys-state-hover-state-layer-opacity);
  }
}
.md-segmented__item:focus-visible::after {
  opacity: var(--md-sys-state-focus-state-layer-opacity);
}
.md-segmented__item:active::after {
  opacity: var(--md-sys-state-pressed-state-layer-opacity);
}

.md-segmented__check,
.md-segmented__label {
  position: relative;
  z-index: 3;
}

.md-segmented__check {
  flex-shrink: 0;
}

/* 万一真的被压缩，宁可省略号，也不要被 .md-ripple-host 的 overflow:hidden 硬切。 */
.md-segmented__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.md-segmented__item.is-selected {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.md-segmented__item.is-selected + .md-segmented__item,
.md-segmented__item.is-selected {
  box-shadow: inset 1px 0 0 0 var(--md-sys-color-outline);
}
</style>
