<script setup lang="ts">
/** Drag-and-drop file picker used by the publish form. */
import { computed, ref } from 'vue'
import { IconClose, IconCloudUpload, IconFolderZip, IconUpload } from '@/icons'
import { M3Button, M3Icon, M3IconButton } from '@/components/m3'

const props = withDefaults(
  defineProps<{
    modelValue: File | null
    accept?: string
    label?: string
    hint?: string
    /** Hard limit in bytes; the parent validates too. */
    maxBytes?: number
    /** Show a preview thumbnail for image accept types. */
    preview?: boolean
    disabled?: boolean
  }>(),
  { accept: undefined, label: '选择文件', hint: undefined, maxBytes: 0, preview: false, disabled: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: File | null): void }>()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const localError = ref('')

const previewUrl = computed(() =>
  props.preview && props.modelValue && props.modelValue.type.startsWith('image/')
    ? URL.createObjectURL(props.modelValue)
    : null,
)

const sizeLabel = computed(() => {
  const bytes = props.modelValue?.size ?? 0
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1) + ' ' + units[index]
})

function choose(): void {
  if (props.disabled) return
  input.value?.click()
}

function applyFile(file: File | null): void {
  localError.value = ''
  if (file && props.maxBytes > 0 && file.size > props.maxBytes) {
    localError.value = `文件过大（${sizeLabel.value}），上限 ${Math.round(props.maxBytes / 1024 / 1024)} MB`
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', file)
}

function onInput(event: Event): void {
  const files = (event.target as HTMLInputElement).files
  applyFile(files && files[0] ? files[0] : null)
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  if (props.disabled) return
  const file = event.dataTransfer?.files?.[0] ?? null
  applyFile(file)
}

function clear(): void {
  applyFile(null)
  if (input.value) input.value.value = ''
}
</script>

<template>
  <div
    class="sc-drop"
    :class="{ 'is-dragging': dragging, 'is-filled': Boolean(modelValue), 'is-disabled': disabled }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="input" class="sr-only" type="file" :accept="accept" :disabled="disabled" @change="onInput" />

    <template v-if="modelValue">
      <img v-if="previewUrl" class="sc-drop__preview" :src="previewUrl" alt="" />
      <span v-else class="sc-drop__icon"><M3Icon :icon="IconFolderZip" :size="28" /></span>
      <div class="sc-drop__meta">
        <p class="md-typescale-title-small">{{ modelValue.name }}</p>
        <p class="md-typescale-body-small sc-muted">{{ sizeLabel }}</p>
      </div>
      <M3IconButton :icon="IconClose" label="移除文件" size="sm" @click="clear" />
    </template>

    <template v-else>
      <span class="sc-drop__icon"><M3Icon :icon="IconCloudUpload" :size="28" /></span>
      <p class="md-typescale-title-small">{{ label }}</p>
      <p v-if="hint" class="md-typescale-body-small sc-muted">{{ hint }}</p>
      <M3Button variant="tonal" size="sm" :icon="IconUpload" :disabled="disabled" @click="choose">
        选择文件
      </M3Button>
    </template>
  </div>

  <p v-if="localError" class="sc-drop__error md-typescale-body-small">{{ localError }}</p>
</template>

<style scoped>
.sc-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  padding: 24px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  text-align: center;
  transition:
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.sc-drop.is-dragging {
  background-color: var(--md-sys-color-primary-container);
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}

.sc-drop.is-filled {
  flex-direction: row;
  justify-content: flex-start;
  min-height: 96px;
  text-align: start;
}

.sc-drop.is-disabled {
  opacity: var(--md-sys-state-disabled-content-opacity);
  pointer-events: none;
}

.sc-drop__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-drop__preview {
  width: 64px;
  height: 64px;
  border-radius: var(--md-sys-shape-corner-medium);
  object-fit: cover;
}

.sc-drop__meta {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.sc-drop__error {
  margin-block-start: 6px;
  color: var(--md-sys-color-error);
}
</style>
