<script setup lang="ts">
/**
 * 一次性令牌展示对话框。
 *
 * 这是整套 API Key 流程里**唯一**能看到明文的地方，因此刻意做得"不好跳过"：
 *   • 不可点遮罩关闭（dismissible=false）—— 必须显式按下「我已保存」；
 *   • 明文默认可见（不是默认打码）：要复制就得先看见，这是签发动作不是查看动作；
 *   • 复制走 Clipboard API，失败时回退到选中文本，兼容非安全上下文（http 部署）。
 * 关闭时父组件要把 token 清空，避免明文在内存里多留一会儿。
 */
import { computed, ref, watch } from 'vue'
import { IconCheck, IconContentCopy, IconKey, IconWarning } from '@/icons'
import { M3Button, M3Dialog, M3Icon } from '@/components/m3'
import type { ApiKeyScope } from '@/api/types'
import { curlExample } from '@/data/apiKeys'

const props = defineProps<{
  modelValue: boolean
  /** 一次性明文；为空则显示占位。 */
  token: string
  /** 这把 Key 的名字，用于标题。 */
  name?: string
  /** 服务端附带的提醒文案。 */
  notice?: string
  /** 作用域码，决定示例命令。 */
  scopes?: ApiKeyScope[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const copied = ref(false)
const example = computed(() => curlExample({ token: props.token || '<你的令牌>', scopes: props.scopes ?? [] }))

watch(
  () => props.modelValue,
  (open) => {
    if (open) copied.value = false
  },
)

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2400)
  } catch {
    // 非安全上下文（http）下 Clipboard API 不可用；退回到手动选中，照样能 Ctrl+C。
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
      copied.value = true
      window.setTimeout(() => (copied.value = false), 2400)
    } finally {
      area.remove()
    }
  }
}
</script>

<template>
  <M3Dialog
    :model-value="modelValue"
    title="保存你的 API 令牌"
    :icon="IconKey"
    :dismissible="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="sc-apikey__warn md-typescale-body-medium">
      <M3Icon :icon="IconWarning" :size="18" />
      <span>{{ notice || '令牌只显示这一次，请立即保存；之后任何接口（包括超管）都无法取回。' }}</span>
    </p>

    <div class="sc-apikey__secret">
      <code class="sc-apikey__token">{{ token }}</code>
      <M3Button
        variant="tonal"
        size="sm"
        :icon="copied ? IconCheck : IconContentCopy"
        @click="copy(token)"
      >
        {{ copied ? '已复制' : '复制' }}
      </M3Button>
    </div>

    <p v-if="name" class="md-typescale-body-small sc-muted">令牌属于「{{ name }}」，请连同它一起放进你的 CI 密钥库。</p>

    <div class="sc-apikey__usage">
      <div class="sc-apikey__usage-head">
        <span class="md-typescale-label-large">命令行用法</span>
        <M3Button variant="text" size="sm" :icon="copied ? IconCheck : IconContentCopy" @click="copy(example)">
          {{ copied ? '已复制' : '复制示例' }}
        </M3Button>
      </div>
      <pre class="sc-apikey__code"><code>{{ example }}</code></pre>
    </div>
  </M3Dialog>
</template>

<style scoped>
.sc-apikey__warn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.sc-apikey__warn :deep(svg) {
  flex-shrink: 0;
  margin-block-start: 2px;
}

.sc-apikey__secret {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
}

.sc-apikey__token {
  flex: 1;
  min-width: 0;
  font-family: var(--md-ref-typeface-mono);
  font-size: 13px;
  line-height: 1.5;
  /* 长令牌在窄屏折行，不横向溢出。 */
  word-break: break-all;
  color: var(--md-sys-color-on-surface);
  user-select: all;
}

.sc-apikey__usage {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-apikey__usage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikey__code {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  font-family: var(--md-ref-typeface-mono);
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
}
</style>
