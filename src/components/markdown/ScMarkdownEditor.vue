<script setup lang="ts">
/**
 * Markdown 编辑器：工具栏 + 「编辑 / 预览」切换。
 *
 * 工具栏按钮围绕光标插入标记（选中即包裹），Ctrl/⌘+Enter 触发提交，
 * 与作者发布/编辑插件时写的 README 是同一套语法，所见即所得地在预览里确认。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { M3Button, M3IconButton, M3Tooltip } from '@/components/m3'
import ScMarkdown from './ScMarkdown.vue'
import {
  IconCode,
  IconDataObject,
  IconFormatBold,
  IconFormatItalic,
  IconFormatListBulleted,
  IconFormatQuote,
  IconLink,
  IconRedo,
  IconTitle,
  IconUndo,
  IconVisibility,
} from '@/icons'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    rows?: number
    maxLength?: number
    hint?: string
  }>(),
  { label: undefined, placeholder: '支持 Markdown：标题、列表、表格、代码块、链接…', rows: 8, maxLength: 20000, hint: undefined },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const mode = ref<'write' | 'preview'>('write')
/** 简易撤销栈：工具栏插入是结构化操作，逐字 undo 体验差，这里按「操作」回退。 */
const history = ref<string[]>([])
const future = ref<string[]>([])

const length = computed(() => props.modelValue.length)

function commit(next: string, pushHistory = true): void {
  if (pushHistory) {
    history.value = [...history.value.slice(-49), props.modelValue]
    future.value = []
  }
  emit('update:modelValue', next)
}

function undo(): void {
  const last = history.value[history.value.length - 1]
  if (last === undefined) return
  future.value = [props.modelValue, ...future.value]
  history.value = history.value.slice(0, -1)
  emit('update:modelValue', last)
}

function redo(): void {
  const [next, ...rest] = future.value
  if (next === undefined) return
  history.value = [...history.value, props.modelValue]
  future.value = rest
  emit('update:modelValue', next)
}

/** 用标记包裹选中内容（无选中时插入占位）。 */
function surround(before: string, after = before, placeholder = '文本'): void {
  const el = textarea.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = props.modelValue.slice(start, end) || placeholder
  const next = props.modelValue.slice(0, start) + before + selected + after + props.modelValue.slice(end)
  commit(next)
  void nextTick(() => {
    el.focus()
    el.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}

/** 在行首加前缀（列表 / 引用 / 标题）。 */
function prefixLines(prefix: string): void {
  const el = textarea.value
  if (!el) return
  const start = props.modelValue.lastIndexOf('\n', Math.max(0, el.selectionStart - 1)) + 1
  const end = el.selectionEnd
  const block = props.modelValue.slice(start, end)
  const next = props.modelValue.slice(0, start) +
    block.split('\n').map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line)).join('\n') +
    props.modelValue.slice(end)
  commit(next)
}

function insertLink(): void {
  surround('[', '](https://)', '链接文字')
}

function insertCode(): void {
  const el = textarea.value
  const selected = el ? props.modelValue.slice(el.selectionStart, el.selectionEnd) : ''
  if (selected.includes('\n')) surround('\n```\n', '\n```\n', 'code')
  else surround('`', '`', 'code')
}

function insertTable(): void {
  commit(props.modelValue + (props.modelValue.endsWith('\n') ? '' : '\n') + '\n| 列 A | 列 B |\n| --- | --- |\n| 内容 | 内容 |\n')
}

const tools = [
  { icon: IconFormatBold, label: '加粗', run: () => surround('**') },
  { icon: IconFormatItalic, label: '斜体', run: () => surround('*') },
  { icon: IconTitle, label: '标题', run: () => prefixLines('## ') },
  { icon: IconFormatListBulleted, label: '无序列表', run: () => prefixLines('- ') },
  { icon: IconFormatQuote, label: '引用', run: () => prefixLines('> ') },
  { icon: IconCode, label: '行内代码 / 代码块', run: insertCode },
  { icon: IconLink, label: '链接', run: insertLink },
  { icon: IconDataObject, label: '表格', run: insertTable },
]

/** 编辑区高度跟随 rows。 */
const textareaStyle = computed(() => ({ minHeight: `${props.rows * 24 + 24}px` }))

watch(mode, (value) => {
  if (value === 'write') void nextTick(() => textarea.value?.focus())
})
</script>

<template>
  <div class="sc-md-editor">
    <div v-if="label" class="sc-md-editor__label md-typescale-label-large">{{ label }}</div>

    <div class="sc-md-editor__bar">
      <div class="sc-md-editor__tools">
        <M3Tooltip v-for="tool in tools" :key="tool.label" :text="tool.label">
          <M3IconButton
            :icon="tool.icon"
            :label="tool.label"
            size="sm"
            variant="standard"
            :disabled="mode === 'preview'"
            @click="tool.run"
          />
        </M3Tooltip>

        <span class="sc-md-editor__sep" aria-hidden="true" />

        <M3Tooltip text="撤销">
          <M3IconButton :icon="IconUndo" label="撤销" size="sm" variant="standard" :disabled="!history.length" @click="undo" />
        </M3Tooltip>
        <M3Tooltip text="重做">
          <M3IconButton :icon="IconRedo" label="重做" size="sm" variant="standard" :disabled="!future.length" @click="redo" />
        </M3Tooltip>
      </div>

      <M3Button
        variant="text"
        size="sm"
        :icon="mode === 'write' ? IconVisibility : IconFormatBold"
        @click="mode = mode === 'write' ? 'preview' : 'write'"
      >
        {{ mode === 'write' ? '预览' : '继续编辑' }}
      </M3Button>
    </div>

    <textarea
      v-if="mode === 'write'"
      ref="textarea"
      class="sc-md-editor__input md-typescale-body-medium"
      :style="textareaStyle"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxLength + 200"
      @input="commit(($event.target as HTMLTextAreaElement).value, false)"
    />

    <div v-else class="sc-md-editor__preview">
      <ScMarkdown :source="modelValue" placeholder="（还没有内容）" />
    </div>

    <div class="sc-md-editor__foot">
      <span class="md-typescale-body-small sc-muted">{{ hint }}</span>
      <span class="md-typescale-body-small" :class="{ 'is-over': length > maxLength }">{{ length }} / {{ maxLength }}</span>
    </div>
  </div>
</template>

<style scoped>
.sc-md-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-md-editor__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 6px;
  border-radius: var(--md-sys-shape-corner-small) var(--md-sys-shape-corner-small) 0 0;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-block-end: none;
}

.sc-md-editor__tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.sc-md-editor__sep {
  width: 1px;
  height: 20px;
  margin-inline: 4px;
  background-color: var(--md-sys-color-outline-variant);
}

.sc-md-editor__input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 0 0 var(--md-sys-shape-corner-small) var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-ref-typeface-mono);
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.sc-md-editor__input:focus-visible {
  border-color: var(--md-sys-color-primary);
}

.sc-md-editor__preview {
  min-height: 120px;
  padding: 14px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 0 0 var(--md-sys-shape-corner-small) var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-low);
}

.sc-md-editor__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sc-md-editor__foot .is-over {
  color: var(--md-sys-color-error);
}
</style>
