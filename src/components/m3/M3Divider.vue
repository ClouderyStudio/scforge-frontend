<script setup lang="ts">
withDefaults(
  defineProps<{
    /** MD3 divider inset: full-bleed, 16dp start inset, or 16dp both sides. */
    inset?: 'none' | 'inset' | 'middle'
    vertical?: boolean
  }>(),
  { inset: 'none', vertical: false },
)
</script>

<template>
  <hr class="md-hr" :class="['md-hr--' + inset, { 'md-hr--vertical': vertical }]" />
</template>

<style scoped>
.md-hr {
  border: 0;
  border-block-start: 1px solid var(--md-sys-color-outline-variant);
  background: none;
  width: 100%;
  flex-shrink: 0;
}

.md-hr--inset {
  margin-inline-start: 16px;
  width: calc(100% - 16px);
}

.md-hr--middle {
  margin-inline: 16px;
  width: calc(100% - 32px);
}

.md-hr--vertical {
  border-block-start: 0;
  border-inline-start: 1px solid var(--md-sys-color-outline-variant);
  height: 100%;
  width: 0;
  align-self: stretch;
}
</style>
