<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Tooltip text (plain tooltip, MD3). */
    text: string
    placement?: 'top' | 'bottom'
  }>(),
  { placement: 'top' },
)
</script>

<template>
  <span class="md-tooltip" :class="'md-tooltip--' + placement">
    <slot />
    <span class="md-tooltip__bubble" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.md-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/*
 * 隐藏时用 display:none 把气泡彻底移出布局。
 *
 * 只写 opacity/visibility 是不够的：绝对定位的气泡即使不可见，仍然会占位并被算进
 * 文档的可滚动溢出区域。触发按钮靠近右边缘时（后台列表的操作列就是这样），整页
 * 因此获得横向滚动能力——手机上表现为页面可以左右拖、内容被切掉半边。
 *
 * display 的切换交给 allow-discrete + @starting-style：出现仍然延迟 300ms 并淡入，
 * 消失仍带淡出，与 MD3 plain tooltip 的行为一致。
 */
.md-tooltip__bubble {
  position: absolute;
  z-index: 120;
  display: none;
  inset-inline-start: 50%;
  translate: -50% 0;
  max-width: min(220px, calc(100vw - 24px));
  padding: 4px 8px;
  border-radius: var(--md-sys-shape-corner-extra-small);
  background-color: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: var(--md-sys-typescale-body-small-line-height);
  letter-spacing: var(--md-sys-typescale-body-small-tracking);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    display var(--md-sys-motion-duration-short4) allow-discrete;
}

.md-tooltip--top .md-tooltip__bubble {
  inset-block-end: calc(100% + 8px);
}

.md-tooltip--bottom .md-tooltip__bubble {
  inset-block-start: calc(100% + 8px);
}

.md-tooltip:hover .md-tooltip__bubble,
.md-tooltip:focus-within .md-tooltip__bubble {
  display: inline-block;
  opacity: 1;
  transition-delay: 300ms, 300ms;
}

@starting-style {
  .md-tooltip:hover .md-tooltip__bubble,
  .md-tooltip:focus-within .md-tooltip__bubble {
    opacity: 0;
  }
}
</style>
