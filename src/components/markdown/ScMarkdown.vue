<script setup lang="ts">
/** 渲染一段 Markdown（已净化）。空内容时显示占位文案。 */
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = withDefaults(
  defineProps<{
    source: string | null | undefined
    /** 空内容时的提示。 */
    placeholder?: string
    /** 紧凑排版（评论用）。 */
    compact?: boolean
  }>(),
  { placeholder: '', compact: false },
)

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div
    v-if="html"
    class="sc-markdown"
    :class="{ 'sc-markdown--compact': compact }"
    v-html="html"
  />
  <p v-else-if="placeholder" class="sc-markdown__empty md-typescale-body-medium sc-muted">{{ placeholder }}</p>
</template>

<style scoped>
.sc-markdown__empty {
  font-style: italic;
}
</style>
