<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconSend } from '@/icons'
import { M3Button } from '@/components/m3'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    submitLabel?: string
    busy?: boolean
    minRows?: number
    maxLength?: number
    /** Render a compact variant used for inline replies. */
    compact?: boolean
  }>(),
  {
    placeholder: '写下你的看法…支持 **加粗**、*斜体*、`行内代码` 与链接。',
    submitLabel: '发表评论',
    busy: false,
    minRows: 4,
    maxLength: 4000,
    compact: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)

const remaining = computed(() => props.maxLength - props.modelValue.length)
const canSubmit = computed(() => props.modelValue.trim().length > 0 && remaining.value >= 0 && !props.busy)

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function submit(): void {
  if (!canSubmit.value) return
  emit('submit')
}

/** Tab indents instead of leaving the field. */
function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
    return
  }
  if (event.key === 'Tab') {
    event.preventDefault()
    const el = textarea.value
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = props.modelValue.slice(0, start) + '  ' + props.modelValue.slice(end)
    emit('update:modelValue', next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 2
    })
  }
}

defineExpose({ focus: () => textarea.value?.focus() })
</script>

<template>
  <div class="sc-editor" :class="{ 'sc-editor--compact': compact }">
    <textarea
      ref="textarea"
      class="sc-editor__input"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="compact ? 3 : minRows"
      :maxlength="maxLength + 200"
      :aria-label="placeholder"
      @input="onInput"
      @keydown="onKeydown"
    />

    <div class="sc-editor__footer">
      <span class="sc-editor__count md-typescale-label-small" :class="{ 'is-over': remaining < 0 }">
        {{ modelValue.length }} / {{ maxLength }}
      </span>
      <div class="sc-editor__actions">
        <M3Button v-if="compact" variant="text" size="sm" @click="emit('cancel')">取消</M3Button>
        <M3Button
          variant="filled"
          size="sm"
          :icon="IconSend"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ busy ? '提交中…' : submitLabel }}
        </M3Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sc-editor {
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  transition: box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.sc-editor:focus-within {
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}

.sc-editor__input {
  display: block;
  width: 100%;
  padding: 14px 16px 8px;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  font: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.sc-editor__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px 12px 16px;
}

.sc-editor__count {
  color: var(--md-sys-color-on-surface-variant);
}

.sc-editor__count.is-over {
  color: var(--md-sys-color-error);
}

.sc-editor__actions {
  display: flex;
  gap: 6px;
}
</style>
