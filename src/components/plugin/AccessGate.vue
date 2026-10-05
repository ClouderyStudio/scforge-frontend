<script setup lang="ts">
/**
 * 隐私插件的解锁门。
 *
 * 服务端对无权访问者只下发脱敏外壳（描述 / readme / 截图 / 版本列表全空），
 * 所以这里不是「遮一层 UI」—— 内容压根没到浏览器，必须靠解锁后重新拉取。
 *
 * 两种模式：
 *   • password —— 口令输入框，校验通过换一枚签名令牌存进 sessionStorage。
 *   • whitelist —— 没有自助入口，只能提示「请联系作者添加你」。
 */
import { ref } from 'vue'
import { IconLock, IconShield } from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import { accessApi } from '@/api/plugins'
import { ApiError, setAccessToken } from '@/api/http'
import type { AccessMode } from '@/api/types'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps<{
  pluginId: string
  accessMode: AccessMode
  /** 作者留的提示语（口令模式下才有值）。 */
  hint?: string | null
}>()

const emit = defineEmits<{ (e: 'unlocked'): void }>()

const snackbar = useSnackbar()
const password = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  const value = password.value.trim()
  if (!value) {
    snackbar.error('请输入访问口令')
    return
  }

  submitting.value = true
  try {
    const result = await accessApi.unlock(props.pluginId, value)
    setAccessToken(result.token)
    password.value = ''
    snackbar.show(result.notice || '解锁成功')
    emit('unlocked')
  } catch (error) {
    // 服务端对「插件不存在」与「口令不对」给的是不同文案，这里照实提示即可 ——
    // 插件本来就靠链接分享，存在性不是秘密。
    snackbar.error(error instanceof ApiError ? error.message : '解锁失败，请稍后再试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="gate">
    <div class="gate__badge">
      <M3Icon :icon="accessMode === 'password' ? IconLock : IconShield" :size="28" />
    </div>

    <h2 class="gate__title">
      {{ accessMode === 'password' ? '该插件需要访问口令' : '该插件仅对指定人员可见' }}
    </h2>

    <p class="gate__text">
      <template v-if="accessMode === 'password'">
        输入作者分发的访问口令即可查看完整内容与下载。
      </template>
      <template v-else>
        这个插件不在公开目录里，只有作者指定的账号可以访问。
      </template>
    </p>

    <p v-if="hint" class="gate__hint">{{ hint }}</p>

    <form v-if="accessMode === 'password'" class="gate__form" @submit.prevent="submit">
      <!-- flex 里的表单控件必须给 min-width:0，否则 min-width:auto 会把下限锁到
           input 的固有宽度（约 180px），在窄屏上把整块撑破。 -->
      <input
        v-model="password"
        class="gate__input"
        type="password"
        placeholder="访问口令"
        autocomplete="off"
        :disabled="submitting"
      />
      <M3Button type="submit" variant="filled" :icon="IconLock" :disabled="submitting">
        {{ submitting ? '验证中' : '解锁' }}
      </M3Button>
    </form>

    <p v-else class="gate__text gate__text--muted">如果你需要访问，请把你的账号告诉插件作者。</p>
  </section>
</template>

<style scoped>
.gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 40px 24px;
  border-radius: var(--border-radius-lg, 16px);
  background: var(--md-sys-color-surface-container-low, rgb(128 128 128 / 8%));
  border: 1px solid var(--md-sys-color-outline-variant, rgb(128 128 128 / 30%));
}

.gate__badge {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--md-sys-color-secondary-container, rgb(128 128 128 / 16%));
  color: var(--md-sys-color-on-secondary-container, inherit);
}

.gate__title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.4;
}

.gate__text {
  margin: 0;
  max-width: 42ch;
  font-size: 14px;
  line-height: 1.6;
  color: var(--md-sys-color-on-surface-variant, inherit);
}

.gate__text--muted {
  font-size: 13px;
  opacity: 0.8;
}

.gate__hint {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--md-sys-color-tertiary-container, rgb(128 128 128 / 12%));
  color: var(--md-sys-color-on-tertiary-container, inherit);
}

.gate__form {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 360px;
  margin-top: 4px;
}

.gate__input {
  flex: 1;
  /* 关键：缺这一行输入框的固有宽度会成为下限，把整块撑破窄屏。 */
  min-width: 0;
  height: 40px;
  padding: 0 14px;
  border-radius: 20px;
  border: 1px solid var(--md-sys-color-outline, rgb(128 128 128 / 40%));
  background: var(--md-sys-color-surface, transparent);
  color: var(--md-sys-color-on-surface, inherit);
  font: inherit;
  font-size: 14px;
}

.gate__input:focus-visible {
  outline: 2px solid var(--md-sys-color-primary, currentColor);
  outline-offset: 1px;
}

@media (max-width: 479px) {
  .gate__form {
    /* 窄屏改为竖排：输入框 + 按钮并排时 360px 已经很挤。 */
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
