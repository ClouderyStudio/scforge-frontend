<script setup lang="ts">
/**
 * 后台加固密钥巡检（/admin/fortify，仅超级管理员）。
 *
 * 存在的理由：加固是中性的 —— 外挂作者同样可能用它给自己的包上锁。
 * 管理端拿到明文 AES 密钥就能解包分析（配合 ModFortify CLI 的
 * `unpack --key <明文>` 即可还原出原始 mod）。
 *
 * 查看是高危动作，三道闸门都在服务端：超管身份、独立查看密码、审计日志。
 * 这里的职责只有：选密钥 → 输查看密码 → 展示一次（明文不出对话框，关掉即走）。
 */
import { computed, onMounted, ref } from 'vue'
import { IconContentCopy, IconKey, IconWarning } from '@/icons'
import { M3Button, M3Dialog, M3Icon, M3Tooltip } from '@/components/m3'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { fortifyAdminApi } from '@/api/admin'
import type { FortifyKeyRecord } from '@/api/types'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatDateTime } from '@/utils/format'

const snackbar = useSnackbar()

const keys = ref<FortifyKeyRecord[]>([])
const loading = ref(true)

/* ---------------- 查看对话框 ---------------- */
const revealTarget = ref<FortifyKeyRecord | null>(null)
const password = ref('')
const revealing = ref(false)
const revealed = ref<{ keyId: string; packageName: string; version: string; key: string } | null>(null)

const revealOpen = computed({
  get: () => revealTarget.value !== null,
  set: (value: boolean) => {
    if (!value) {
      revealTarget.value = null
      password.value = ''
      revealed.value = null
    }
  },
})

onMounted(() => void load())

async function load(): Promise<void> {
  loading.value = true
  try {
    keys.value = (await fortifyAdminApi.list()).items
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '读取加固密钥失败')
  } finally {
    loading.value = false
  }
}

async function reveal(): Promise<void> {
  if (!revealTarget.value || !password.value) return
  revealing.value = true
  try {
    revealed.value = await fortifyAdminApi.reveal(revealTarget.value.id, password.value)
    snackbar.show('已查看 —— 该动作已记入服务端审计日志')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '查看失败')
  } finally {
    revealing.value = false
  }
}

async function copyKey(): Promise<void> {
  if (!revealed.value) return
  await navigator.clipboard.writeText(revealed.value.key)
  snackbar.show('已复制到剪贴板')
}
</script>

<template>
  <section class="sc-admin-body">
    <div class="sc-fortifyadm__head">
      <p class="md-typescale-body-medium sc-muted">
        全站加固密钥巡检。查看明文需要<b>独立查看密码</b>（服务器配置
        <code>Scforge:Fortify:RevealPassword</code>，与账号无关）；
        每次查看与失败尝试都会记入服务端审计日志，接口限流 5 次 / 5 分钟。
      </p>
    </div>

    <LoadingSkeleton v-if="loading" />

    <template v-else>
      <ul v-if="keys.length" class="sc-fortifyadm__list">
        <li v-for="item in keys" :key="item.id" class="sc-fortifyadm__item" :class="{ 'sc-fortifyadm__item--off': !item.active }">
          <span class="sc-fortifyadm__dot" :class="item.active ? 'is-active' : 'is-revoked'" />
          <div class="sc-fortifyadm__meta">
            <span class="sc-fortifyadm__keyid md-typescale-body-medium">{{ item.keyId.slice(0, 12) }}…</span>
            <span class="md-typescale-body-small sc-muted">
              {{ item.packageName }} · {{ item.version }} ·
              指纹 {{ item.authorKeyFingerprint.slice(0, 12) }}… ·
              {{ formatDateTime(item.createdAt) }}
              <template v-if="!item.active"> · {{ formatDateTime(item.revokedAt) }} 已作废</template>
            </span>
          </div>
          <M3Tooltip :text="item.active ? '查看明文密钥（高危，会记入审计）' : '已作废的密钥取不到明文'">
            <M3Button
              variant="tonal"
              :icon="IconKey"
              :disabled="!item.active"
              @click="revealTarget = item"
            >
              查看
            </M3Button>
          </M3Tooltip>
        </li>
      </ul>
      <EmptyState v-else title="还没有任何加固密钥" description="作者在网页或 CLI 登记后出现在这里。" />
    </template>

    <!-- ---------------- 查看（密码 → 明文，一屏走完） ---------------- -->
    <M3Dialog v-model="revealOpen" title="查看加固密钥明文">
      <template v-if="!revealed && revealTarget">
        <p class="md-typescale-body-medium">
          <M3Icon :icon="IconWarning" :size="16" />
          这是高危动作：明文密钥可以解开对应的所有加固包。输入独立查看密码确认 ——
          本次查看（含失败尝试）已会被记入服务端审计日志。
        </p>
        <input
          v-model="password"
          class="sc-fortifyadm__input md-typescale-body-medium"
          type="password"
          autocomplete="off"
          placeholder="独立查看密码（非登录密码）"
          @keyup.enter="reveal"
        />
      </template>
      <template v-else-if="revealed">
        <p class="md-typescale-body-medium">
          <b>{{ revealed.packageName }}</b> {{ revealed.version }} 的 AES 密钥
          （keyId <code>{{ revealed.keyId.slice(0, 12) }}…</code>）：
        </p>
        <div class="sc-fortifyadm__revealed">
          <code class="md-typescale-body-medium">{{ revealed.key }}</code>
          <M3Button variant="tonal" :icon="IconContentCopy" @click="copyKey">复制</M3Button>
        </div>
        <p class="md-typescale-body-small sc-muted">
          用法：<code>ModFortify.Cli.dll unpack 加固包.netmod --key &lt;上面的密钥&gt;</code>
        </p>
      </template>
      <template #actions>
        <M3Button variant="text" @click="revealOpen = false">关闭</M3Button>
        <M3Button
          v-if="!revealed"
          variant="filled"
          :disabled="revealing || !password"
          @click="reveal"
        >
          {{ revealing ? '验证中…' : '确认查看' }}
        </M3Button>
      </template>
    </M3Dialog>
  </section>
</template>

<style scoped>
.sc-fortifyadm__head code {
  padding: 1px 6px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  font-size: 0.9em;
}

.sc-fortifyadm__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sc-fortifyadm__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
}

.sc-fortifyadm__item--off {
  opacity: 0.55;
}

.sc-fortifyadm__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.sc-fortifyadm__dot.is-active {
  background-color: var(--md-sys-color-primary);
}

.sc-fortifyadm__dot.is-revoked {
  background-color: var(--md-sys-color-outline);
}

.sc-fortifyadm__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sc-fortifyadm__keyid {
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
}

.sc-fortifyadm__input {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.sc-fortifyadm__revealed {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
}

.sc-fortifyadm__revealed code {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: ui-monospace, monospace;
}
</style>
