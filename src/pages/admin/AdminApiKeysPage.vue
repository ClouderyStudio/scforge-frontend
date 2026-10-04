<script setup lang="ts">
/**
 * 后台 API Key 巡检（/admin/api-keys，仅超级管理员）。
 *
 * 与用户自助页的分工：这里能看**全站**的 Key（含别人的），并且是唯一能签发
 * 「管理」作用域的地方 —— 自助流程做不到这一件事。
 * 页面本身不判断权限：非超管进来后端会 403，前端只在入口处按身份隐藏。
 */
import { computed, onMounted, ref } from 'vue'
import { IconAutorenew, IconBlock, IconKey, IconPersonAdd, IconSearch, IconWarning } from '@/icons'
import { M3Button, M3Dialog, M3Icon, M3IconButton, M3Tooltip } from '@/components/m3'
import ApiKeyTokenDialog from '@/components/apikey/ApiKeyTokenDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { adminApi } from '@/api/admin'
import { adminApiKeysApi } from '@/api/apiKeys'
import type { ApiKeyRecord, ApiKeyScope, ApiKeyScopeCatalog, UserCandidate } from '@/api/types'
import { expiryToIso, EXPIRY_PRESETS, STATUS_CLASS } from '@/data/apiKeys'
import { useAdmin } from '@/composables/useAdmin'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatDateTime, formatRelative } from '@/utils/format'

const snackbar = useSnackbar()
const { isSuperAdmin } = useAdmin()

const keys = ref<ApiKeyRecord[]>([])
const catalog = ref<ApiKeyScopeCatalog | null>(null)
const loading = ref(true)
const busy = ref<string | null>(null)

/* 搜索：后端一次把全站 Key 拉下来，筛选在前端做 —— 数据量是"个位数到几十把"级别。 */
const keyword = ref('')
const statusFilter = ref<string>('all')

/* ---------------- 为指定用户签发 ---------------- */
const issueOpen = ref(false)
const searchTerm = ref('')
const candidates = ref<UserCandidate[]>([])
const searched = ref(false)
const picked = ref<UserCandidate | null>(null)
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

const filtered = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return keys.value.filter((item) => {
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false
    if (!key) return true
    return (
      item.name.toLowerCase().includes(key) ||
      item.userName.toLowerCase().includes(key) ||
      item.prefix.toLowerCase().includes(key)
    )
  })
})

const stats = computed(() => ({
  total: keys.value.length,
  active: keys.value.filter((key) => key.usable).length,
  // 长期有效且还没被用过的，是最值得盯的一类：要么是发版机器人，要么是忘了设期限的试验品。
  idleForever: keys.value.filter((key) => key.usable && !key.expiresAt && !key.lastUsedAt).length,
}))

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

function openIssue(): void {
  issueOpen.value = true
  searchTerm.value = ''
  candidates.value = []
  searched.value = false
  picked.value = null
  draftName.value = ''
  draftScopes.value = ['publish']
  draftExpiry.value = 90
}

async function search(): Promise<void> {
  const key = searchTerm.value.trim()
  if (!key) return
  try {
    const result = await adminApi.searchUsers(key)
    candidates.value = result.items
    searched.value = true
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '搜索失败')
  }
}

function choose(user: UserCandidate): void {
  picked.value = user
  if (!draftName.value) draftName.value = `${user.username} 的密钥`
}

async function submit(): Promise<void> {
  const target = picked.value
  if (!target) {
    snackbar.error('请先选择要为其签发的用户')
    return
  }
  if (!draftScopes.value.length) {
    snackbar.error('请至少选择一个作用域')
    return
  }
  submitting.value = true
  try {
    const result = await adminApiKeysApi.createForUser(
      { userId: target.userId, userName: target.username },
      {
        name: draftName.value.trim() || undefined,
        scopes: draftScopes.value,
        expiresAt: expiryToIso(draftExpiry.value),
      },
    )
    issueOpen.value = false
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

function closeIssued(): void {
  issuedToken.value = ''
  issuedNotice.value = ''
  issuedKey.value = null
}

async function rotate(record: ApiKeyRecord): Promise<void> {
  busy.value = record.id
  try {
    const result = await adminApiKeysApi.rotate(record.id)
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
    await adminApiKeysApi.revoke(record.id, '管理员在后台吊销')
    snackbar.success('已吊销')
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
    const [list, scopeCatalog] = await Promise.all([adminApiKeysApi.list(), adminApiKeysApi.scopes()])
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
  <section class="sc-admin-body">
    <div class="sc-apikeys__head">
      <p class="md-typescale-body-medium sc-muted">
        全站 API Key 巡检。这里能看到每一把密钥的归属、作用域与最近使用情况，并可为指定用户签发
        —— 含自助流程拿不到的「管理」作用域。令牌明文只在签发时显示一次。
      </p>
      <M3Button v-if="isSuperAdmin" variant="filled" :icon="IconPersonAdd" @click="openIssue">为用户签发</M3Button>
    </div>

    <div class="sc-apikeys__stats">
      <span class="md-tag">共 {{ stats.total }} 把</span>
      <span class="md-tag sc-apikeys__tag--active">有效 {{ stats.active }}</span>
      <span v-if="stats.idleForever" class="md-tag sc-apikeys__tag--warn">长期有效且未用过 {{ stats.idleForever }}</span>
    </div>

    <div class="sc-apikeys__filters">
      <div class="sc-apikeys__search">
        <M3Icon :icon="IconSearch" :size="18" />
        <input
          v-model="keyword"
          class="md-typescale-body-medium"
          placeholder="按名称、用户或前缀筛选"
          aria-label="筛选 API Key"
        />
      </div>
      <select v-model="statusFilter" class="sc-apikeys__select md-typescale-body-medium" aria-label="按状态筛选">
        <option value="all">全部状态</option>
        <option value="有效">有效</option>
        <option value="已过期">已过期</option>
        <option value="已吊销">已吊销</option>
      </select>
    </div>

    <LoadingSkeleton v-if="loading" :rows="3" />

    <div v-else-if="filtered.length" class="sc-apikeys__list">
      <article v-for="key in filtered" :key="key.id" class="sc-apikeys__row" :class="{ 'is-dead': !key.usable }">
        <span class="sc-apikeys__icon"><M3Icon :icon="IconKey" :size="20" /></span>
        <div class="sc-apikeys__main">
          <p class="md-typescale-title-medium">
            {{ key.name }}
            <span class="md-tag" :class="STATUS_CLASS[key.status]">{{ key.status }}</span>
            <span class="md-tag md-tag--outlined">{{ key.userName }}</span>
          </p>
          <p class="sc-apikeys__masked md-typescale-body-small"><code>{{ key.maskedToken }}</code></p>
          <p class="md-typescale-body-small sc-muted">
            <template v-for="scope in key.scopes" :key="scope">
              <span class="md-tag md-tag--outlined">{{ labelOf(scope) }}</span>
            </template>
          </p>
          <p class="md-typescale-body-small sc-muted">
            创建 {{ formatDateTime(key.createdAt) }} ·
            <template v-if="key.expiresAt">{{ formatDateTime(key.expiresAt) }} 过期</template>
            <template v-else>长期有效</template>
            <template v-if="key.lastUsedAt"> · 最近使用 {{ formatRelative(key.lastUsedAt) }}（{{ key.lastUsedIp }}）</template>
            <template v-else> · 从未使用</template>
          </p>
        </div>
        <div v-if="isSuperAdmin" class="sc-apikeys__actions">
          <M3Tooltip text="轮换：立刻吊销这把并签发同权限的新令牌">
            <span>
              <M3Button
                variant="tonal"
                size="sm"
                :icon="IconAutorenew"
                :disabled="!key.usable || busy === key.id"
                @click="rotate(key)"
              >
                轮换
              </M3Button>
            </span>
          </M3Tooltip>
          <M3Tooltip v-if="key.usable" text="吊销这把密钥">
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
    </div>

    <EmptyState
      v-else-if="keys.length"
      title="没有匹配的密钥"
      description="换个关键词，或把状态筛选调回「全部状态」。"
      :icon="IconSearch"
    />
    <EmptyState
      v-else
      title="全站还没有 API Key"
      description="用户可以在「API 密钥」页自助签发，也可以由你在这里为指定用户签发。"
      :icon="IconKey"
    />

    <!-- ---------- 为指定用户签发 ---------- -->
    <M3Dialog v-model="issueOpen" title="为用户签发 API Key" :icon="IconPersonAdd">
      <label class="sc-apikeys__field">
        <span class="md-typescale-label-large">用户名或邮箱</span>
        <div class="sc-apikeys__search">
          <M3Icon :icon="IconSearch" :size="18" />
          <input
            v-model="searchTerm"
            class="md-typescale-body-medium"
            placeholder="输入后回车搜索"
            @keydown.enter.prevent="search"
          />
          <M3Button variant="text" size="sm" @click="search">搜索</M3Button>
        </div>
      </label>

      <ul v-if="candidates.length" class="sc-apikeys__candidates">
        <li v-for="user in candidates" :key="user.userId">
          <button
            type="button"
            class="sc-apikeys__candidate"
            :class="{ 'is-picked': picked?.userId === user.userId }"
            @click="choose(user)"
          >
            <span>{{ user.username }}</span>
            <span class="md-typescale-body-small sc-muted">{{ user.email ?? '无邮箱' }}</span>
          </button>
        </li>
      </ul>
      <p v-else-if="searched" class="md-typescale-body-small sc-muted">没有找到匹配的用户。</p>

      <label class="sc-apikeys__field">
        <span class="md-typescale-label-large">名称</span>
        <input v-model="draftName" class="sc-apikeys__input md-typescale-body-medium" maxlength="60" placeholder="例如 CI 发版令牌" />
      </label>

      <div class="sc-apikeys__field">
        <span class="md-typescale-label-large">作用域 *</span>
        <label v-for="item in catalog?.items ?? []" :key="item.key" class="sc-apikeys__scope">
          <input type="checkbox" :checked="draftScopes.includes(item.key)" @change="toggleScope(item.key)" />
          <span>
            <b>{{ item.label }}</b>
            <span class="md-typescale-body-small sc-muted">{{ item.description }}</span>
          </span>
        </label>
        <p class="md-typescale-body-small sc-muted">「管理」只能在这里授予 —— 用户自助页看不到这个选项。</p>
      </div>

      <div class="sc-apikeys__field">
        <span class="md-typescale-label-large">有效期</span>
        <div class="sc-apikeys__chips">
          <M3Chip
            v-for="preset in EXPIRY_PRESETS"
            :key="String(preset.value)"
            :label="preset.label"
            variant="filter"
            :selected="draftExpiry === preset.value"
            @click="draftExpiry = preset.value"
          />
        </div>
      </div>

      <template #actions>
        <M3Button variant="text" @click="issueOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="submitting || !draftScopes.length" @click="submit">
          {{ submitting ? '签发中…' : '签发' }}
        </M3Button>
      </template>
    </M3Dialog>

    <ApiKeyTokenDialog
      :model-value="issuedToken !== ''"
      :token="issuedToken"
      :name="issuedKey?.name"
      :notice="issuedNotice"
      :scopes="issuedKey?.scopes"
      @update:model-value="(open) => !open && closeIssued()"
    />

    <M3Dialog v-model="revokeOpen" title="吊销这把密钥？" :icon="IconWarning">
      <p class="md-typescale-body-medium">
        <b>{{ confirmRevoke?.name }}</b>（归属 {{ confirmRevoke?.userName }}）会立刻失效。
      </p>
      <template #actions>
        <M3Button variant="text" @click="revokeOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="busy !== null" @click="revoke">确认吊销</M3Button>
      </template>
    </M3Dialog>
  </section>
</template>

<style scoped>
.sc-apikeys__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.sc-apikeys__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sc-apikeys__tag--active {
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.sc-apikeys__tag--warn {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-apikeys__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sc-apikeys__search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 220px;
  height: 40px;
  padding-inline: 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikeys__search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.sc-apikeys__select {
  padding: 10px 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  font: inherit;
  cursor: pointer;
}

.sc-apikeys__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-apikeys__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-apikeys__row.is-dead {
  background-color: var(--md-sys-color-surface-container);
}

.sc-apikeys__row.is-dead .sc-apikeys__icon {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-apikeys__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-apikeys__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sc-apikeys__main > p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-apikeys__masked code {
  font-family: var(--md-ref-typeface-mono);
  word-break: break-all;
}

.sc-apikeys__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sc-apikeys__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block: 8px;
}

.sc-apikeys__input {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  font: inherit;
  outline: none;
}

.sc-apikeys__scope {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}

.sc-apikeys__scope > span {
  display: flex;
  flex-direction: column;
}

.sc-apikeys__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-apikeys__candidates {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sc-apikeys__candidate {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background: none;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.sc-apikeys__candidate:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.sc-apikeys__candidate.is-picked {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

@media (max-width: 719px) {
  .sc-apikeys__row {
    flex-wrap: wrap;
  }

  .sc-apikeys__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
