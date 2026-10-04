<script setup lang="ts">
/**
 * API Key 自助管理（/api-keys）。
 *
 * 面向发布者：签发一把机器凭据，让 CI / 脚本直接调 SCForge 接口，不必再走网页表单。
 * 作用域里**没有**「管理」—— 那把只能由超管在后台签发，这里不显示也不允许勾选。
 */
import { computed, onMounted, ref } from 'vue'
import {
  IconAdd,
  IconAutorenew,
  IconBlock,
  IconKey,
  IconShield,
  IconTerminal,
  IconWarning,
} from '@/icons'
import { M3Button, M3Chip, M3Dialog, M3Icon, M3IconButton, M3Tooltip } from '@/components/m3'
import ApiKeyTokenDialog from '@/components/apikey/ApiKeyTokenDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { apiKeysApi } from '@/api/apiKeys'
import type { ApiKeyRecord, ApiKeyScope, ApiKeyScopeCatalog } from '@/api/types'
import { EXPIRY_PRESETS, expiryToIso, STATUS_CLASS } from '@/data/apiKeys'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatDateTime, formatRelative } from '@/utils/format'

const snackbar = useSnackbar()

const keys = ref<ApiKeyRecord[]>([])
const catalog = ref<ApiKeyScopeCatalog | null>(null)
const loading = ref(true)
const busy = ref<string | null>(null)

/* ---------------- 签发 ---------------- */
const createOpen = ref(false)
const draftName = ref('')
const draftScopes = ref<ApiKeyScope[]>(['publish'])
const draftExpiry = ref<number | null>(90)
const submitting = ref(false)

/* ---------------- 一次性令牌 ---------------- */
const issuedToken = ref('')
const issuedNotice = ref('')
const issuedKey = ref<ApiKeyRecord | null>(null)

/* ---------------- 吊销确认 ---------------- */
const confirmRevoke = ref<ApiKeyRecord | null>(null)
const revokeOpen = ref(false)

const activeCount = computed(() => keys.value.filter((key) => key.usable).length)

/**
 * 自助可勾的作用域**目录项**。
 *
 * `catalog.selfService` 只是码数组（`['read','publish']`），渲染要的是带 label /
 * description 的 `items`，所以按 selfService 过滤一次 —— 顺带把自助申请不到的 `manage`
 * 排除掉。后端签发时还会再过滤一次，前端这层只负责别把选项露出来。
 */
const grantable = computed(() => {
  const allowed = catalog.value?.selfService ?? []
  return (catalog.value?.items ?? []).filter((item) => allowed.includes(item.key))
})

function labelOf(scope: string): string {
  return catalog.value?.items.find((item) => item.key === scope)?.label ?? scope
}

function toggleScope(scope: ApiKeyScope): void {
  const next = [...draftScopes.value]
  const index = next.indexOf(scope)
  if (index >= 0) next.splice(index, 1)
  else next.push(scope)
  draftScopes.value = next
}

function openCreate(): void {
  createOpen.value = true
  draftName.value = ''
  draftScopes.value = ['publish']
  draftExpiry.value = 90
}

async function submit(): Promise<void> {
  if (!draftScopes.value.length) {
    snackbar.error('请至少选择一个作用域')
    return
  }
  submitting.value = true
  try {
    const result = await apiKeysApi.create({
      name: draftName.value.trim() || undefined,
      scopes: draftScopes.value,
      expiresAt: expiryToIso(draftExpiry.value),
    })
    createOpen.value = false
    showIssued(result.token, result.notice, result.key)
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '签发失败')
  } finally {
    submitting.value = false
  }
}

function showIssued(token: string, notice: string, key: ApiKeyRecord): void {
  issuedToken.value = token
  issuedNotice.value = notice
  issuedKey.value = key
}

/** 关掉令牌对话框即视为"已保存"；明文立刻从内存里抹掉，界面不可能再显示第二次。 */
function closeIssued(): void {
  issuedToken.value = ''
  issuedNotice.value = ''
  issuedKey.value = null
}

async function rotate(record: ApiKeyRecord): Promise<void> {
  busy.value = record.id
  try {
    const result = await apiKeysApi.rotate(record.id)
    showIssued(result.token, result.notice, result.key)
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '轮换失败')
  } finally {
    busy.value = null
  }
}

async function revoke(): Promise<void> {
  const record = confirmRevoke.value
  if (!record) return
  busy.value = record.id
  try {
    await apiKeysApi.revoke(record.id, '用户在网页上吊销')
    snackbar.success('已吊销，该令牌立即失效')
    revokeOpen.value = false
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '吊销失败')
  } finally {
    busy.value = null
  }
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const [list, scopeCatalog] = await Promise.all([apiKeysApi.mine(), apiKeysApi.scopes()])
    keys.value = list.items
    catalog.value = scopeCatalog
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="sc-apikey sc-shell">
    <header class="sc-apikey__head">
      <div>
        <h1 class="md-typescale-headline-medium">API 密钥</h1>
        <p class="md-typescale-body-large sc-muted">
          给脚本和 CI 用的一把机器凭据 —— 用它可以命令行发布插件，不必再开网页表单。
        </p>
      </div>
      <M3Button variant="filled" :icon="IconAdd" @click="openCreate">签发新密钥</M3Button>
    </header>

    <!-- 用法说明：拿到 Key 的人第一眼要看到的是"怎么用"，不是"怎么建"。 -->
    <section class="sc-apikey__intro">
      <h2 class="md-typescale-title-small">
        <M3Icon :icon="IconTerminal" :size="18" />
        怎么用
      </h2>
      <ol class="sc-apikey__steps md-typescale-body-medium">
        <li>签发一把密钥，选好作用域与有效期。</li>
        <li>把令牌存进 CI 的密钥管理（GitHub Actions Secrets、GitLab CI Variables 等），<b>不要提交进仓库</b>。</li>
        <li>请求头带上 <code class="sc-apikey__inline-code">Authorization: Bearer scf_…</code>，其余接口与网页完全一致。</li>
      </ol>
      <p class="sc-apikey__note md-typescale-body-small">
        <M3Icon :icon="IconShield" :size="16" />
        <span>
          令牌只在签发的那一次显示，平台只存哈希、无法找回。网页登录与令牌是两条独立通道，
          两者同时存在时以网页登录为准。
        </span>
      </p>
    </section>

    <section class="sc-apikey__list">
      <LoadingSkeleton v-if="loading" :rows="2" />

      <template v-else-if="keys.length">
        <article v-for="key in keys" :key="key.id" class="sc-apikey__row" :class="{ 'is-dead': !key.usable }">
          <span class="sc-apikey__icon"><M3Icon :icon="IconKey" :size="20" /></span>

          <div class="sc-apikey__main">
            <p class="md-typescale-title-medium">
              {{ key.name }}
              <span class="md-tag" :class="STATUS_CLASS[key.status]">{{ key.status }}</span>
            </p>
            <p class="sc-apikey__masked md-typescale-body-small">
              <code>{{ key.maskedToken }}</code>
              <M3Tooltip text="这里只显示前缀与掩码，明文无法取回">
                <M3Icon :icon="IconBlock" :size="14" />
              </M3Tooltip>
            </p>
            <p class="md-typescale-body-small sc-muted">
              <template v-for="scope in key.scopes" :key="scope">
                <span class="md-tag md-tag--outlined">{{ labelOf(scope) }}</span>
              </template>
            </p>
            <p class="md-typescale-body-small sc-muted">
              创建于 {{ formatDateTime(key.createdAt) }} ·
              <template v-if="key.expiresAt">{{ formatDateTime(key.expiresAt) }} 过期</template>
              <template v-else>长期有效</template>
              <template v-if="key.lastUsedAt"> · 最近使用 {{ formatRelative(key.lastUsedAt) }}</template>
              <template v-if="key.lastUsedIp">（{{ key.lastUsedIp }}）</template>
            </p>
            <p v-if="key.revokedAt" class="sc-apikey__revoked md-typescale-body-small">
              {{ formatDateTime(key.revokedAt) }} 已吊销<template v-if="key.revokedReason"> · {{ key.revokedReason }}</template>
            </p>
          </div>

          <div class="sc-apikey__actions">
            <M3Tooltip v-if="key.usable" text="怀疑泄露？轮换会立刻吊销这把并签发同权限的新令牌">
              <span>
                <M3Button
                  variant="tonal"
                  size="sm"
                  :icon="IconAutorenew"
                  :disabled="busy === key.id"
                  @click="rotate(key)"
                >
                  轮换
                </M3Button>
              </span>
            </M3Tooltip>
            <M3Tooltip v-if="key.usable" text="吊销后立即失效，不可恢复">
              <M3IconButton
                :icon="IconBlock"
                label="吊销密钥"
                variant="standard"
                :disabled="busy === key.id"
                @click="((confirmRevoke = key), (revokeOpen = true))"
              />
            </M3Tooltip>
          </div>
        </article>
      </template>

      <EmptyState
        v-else
        :icon="IconKey"
        title="还没有 API 密钥"
        description="如果你用脚本或 CI 发版，签发一把密钥就能把发布流程自动化。"
        action-label="签发第一把密钥"
        @action="openCreate"
      />
    </section>

    <!-- ---------- 签发 ---------- -->
    <M3Dialog v-model="createOpen" title="签发 API 密钥" :icon="IconKey">
      <label class="sc-apikey__field">
        <span class="md-typescale-label-large">名称</span>
        <input
          v-model="draftName"
          class="sc-apikey__input md-typescale-body-medium"
          maxlength="60"
          placeholder="例如 发版机器人"
        />
        <span class="md-typescale-body-small sc-muted">只用于你自己区分，不参与鉴权。</span>
      </label>

      <div class="sc-apikey__field">
        <span class="md-typescale-label-large">作用域 *</span>
        <label v-for="item in grantable" :key="item.key" class="sc-apikey__scope">
          <input type="checkbox" :checked="draftScopes.includes(item.key)" @change="toggleScope(item.key)" />
          <span>
            <b>{{ item.label }}</b>
            <span class="md-typescale-body-small sc-muted">{{ item.description }}</span>
          </span>
        </label>
        <p class="md-typescale-body-small sc-muted">
          「管理」（删除自己的插件、重提审核）不开放自助申请，需要时请联系管理员在后台签发。
        </p>
      </div>

      <div class="sc-apikey__field">
        <span class="md-typescale-label-large">有效期</span>
        <div class="sc-apikey__chips">
          <M3Chip
            v-for="preset in EXPIRY_PRESETS"
            :key="String(preset.value)"
            :label="preset.label"
            variant="filter"
            :selected="draftExpiry === preset.value"
            @click="draftExpiry = preset.value"
          />
        </div>
        <p class="md-typescale-body-small sc-muted">
          建议给脚本用的密钥设一个期限：万一泄露，失效时间有上限，不必等人工巡检。
        </p>
      </div>

      <template #actions>
        <M3Button variant="text" @click="createOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="submitting || !draftScopes.length" @click="submit">
          {{ submitting ? '签发中…' : '签发' }}
        </M3Button>
      </template>
    </M3Dialog>

    <!-- ---------- 一次性令牌 ---------- -->
    <ApiKeyTokenDialog
      :model-value="issuedToken !== ''"
      :token="issuedToken"
      :name="issuedKey?.name"
      :notice="issuedNotice"
      :scopes="issuedKey?.scopes"
      @update:model-value="(open) => !open && closeIssued()"
    />

    <!-- ---------- 吊销确认 ---------- -->
    <M3Dialog v-model="revokeOpen" title="吊销这把密钥？" :icon="IconWarning">
      <p class="md-typescale-body-medium">
        <b>{{ confirmRevoke?.name }}</b> 会立刻失效，正在使用它的脚本或流水线会开始收到 401。
      </p>
      <p class="md-typescale-body-small sc-muted">如果只是想换一把新的，用「轮换」更合适 —— 旧的同时失效，新的立刻可用。</p>
      <template #actions>
        <M3Button variant="text" @click="revokeOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="busy !== null" @click="revoke">确认吊销</M3Button>
      </template>
    </M3Dialog>

    <p class="sc-apikey__foot md-typescale-body-small sc-muted">
      当前有效 {{ activeCount }} 把 · 共 {{ keys.length }} 把。吊销记录会保留，便于事后追溯。
    </p>
  </div>
</template>

<style scoped>
.sc-apikey {
  padding-block: 32px 72px;
}

.sc-apikey__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-block-end: 20px;
}

.sc-apikey__head h1 {
  font-family: var(--md-ref-typeface-brand);
}

.sc-apikey__intro {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  margin-block-end: 20px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-apikey__intro h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--md-typescale-title-small-weight);
}

.sc-apikey__steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-inline-start: 20px;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikey__inline-code {
  padding: 1px 6px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  font-family: var(--md-ref-typeface-mono);
  font-size: 0.92em;
}

.sc-apikey__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikey__note :deep(svg) {
  flex-shrink: 0;
  margin-block-start: 2px;
}

.sc-apikey__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sc-apikey__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

/* 失效的 Key 不该和有效的长得一样重，否则一眼扫过去分不出哪把还能用。 */
.sc-apikey__row.is-dead {
  background-color: var(--md-sys-color-surface-container);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-apikey__row.is-dead .sc-apikey__icon {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikey__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-apikey__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sc-apikey__main > p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-apikey__masked {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikey__masked code {
  font-family: var(--md-ref-typeface-mono);
  word-break: break-all;
}

.sc-apikey__revoked {
  color: var(--md-sys-color-error);
}

.sc-apikey__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sc-apikey__status--active {
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.sc-apikey__status--revoked {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.sc-apikey__status--expired {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikey__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block: 8px;
}

.sc-apikey__input {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  font: inherit;
  outline: none;
}

.sc-apikey__input:focus-visible {
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}

.sc-apikey__scope {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}

.sc-apikey__scope > span {
  display: flex;
  flex-direction: column;
}

.sc-apikey__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-apikey__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-block-start: 20px;
}

@media (max-width: 719px) {
  .sc-apikey__row {
    flex-wrap: wrap;
  }

  .sc-apikey__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
