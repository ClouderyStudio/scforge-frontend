<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IconDelete, IconGavel, IconPersonAdd, IconSearch, IconShieldPerson } from '@/icons'
import { M3Button, M3Dialog, M3Icon, M3IconButton, M3Tooltip } from '@/components/m3'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { adminApi } from '@/api/admin'
import type { AdminRecord, AdminRole, PermissionOption, UserCandidate } from '@/api/types'
import { useAdmin } from '@/composables/useAdmin'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatDateTime } from '@/utils/format'

const snackbar = useSnackbar()
const { me, isSuperAdmin } = useAdmin()

const admins = ref<AdminRecord[]>([])
const catalog = ref<PermissionOption[]>([])
const loading = ref(true)
const busy = ref<string | null>(null)
const confirmRemove = ref<AdminRecord | null>(null)
const removeOpen = ref(false)

/* ---------------- 指定 / 调整管理员 ---------------- */
const grantOpen = ref(false)
const keyword = ref('')
const candidates = ref<UserCandidate[]>([])
const searched = ref(false)
const picked = ref<UserCandidate | null>(null)
const role = ref<AdminRole>('admin')
const permissions = ref<string[]>([])
const submitting = ref(false)

const isSuperRole = computed(() => role.value === 'super')

function openGrant(record?: AdminRecord): void {
  grantOpen.value = true
  searched.value = false
  candidates.value = []
  keyword.value = ''
  if (record) {
    picked.value = {
      userId: record.userId,
      username: record.username,
      email: null,
      avatar: record.avatar,
      currentRole: record.role,
    }
    role.value = record.role
    permissions.value = [...record.permissions]
  } else {
    picked.value = null
    role.value = 'admin'
    permissions.value = []
  }
}

async function search(): Promise<void> {
  const key = keyword.value.trim()
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
  if (user.currentRole) role.value = user.currentRole
}

function togglePermission(key: string): void {
  const next = [...permissions.value]
  const index = next.indexOf(key)
  if (index >= 0) next.splice(index, 1)
  else next.push(key)
  permissions.value = next
}

async function submit(): Promise<void> {
  const target = picked.value
  if (!target) {
    snackbar.error('请先选择要指定的用户')
    return
  }
  submitting.value = true
  try {
    await adminApi.upsertAdmin({ username: target.username, role: role.value, permissions: permissions.value })
    snackbar.success(role.value === 'super' ? '已设为超级管理员' : '已设为管理员')
    grantOpen.value = false
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

async function remove(): Promise<void> {
  const record = confirmRemove.value
  if (!record) return
  busy.value = record.id
  try {
    await adminApi.deleteAdmin(record.id)
    snackbar.success('已撤销该管理员')
    removeOpen.value = false
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '撤销失败')
  } finally {
    busy.value = null
  }
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await adminApi.listAdmins()
    admins.value = result.items
    catalog.value = me.value?.catalog ?? []
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
    <div class="sc-admins__head">
      <p class="md-typescale-body-medium sc-muted">
        超级管理员拥有全部权限，并且是唯一能指定/调整/撤销管理员的人。普通管理员只拥有勾选出来的权限。
      </p>
      <M3Button v-if="isSuperAdmin" variant="filled" :icon="IconPersonAdd" @click="openGrant()">指定管理员</M3Button>
    </div>

    <LoadingSkeleton v-if="loading" :rows="2" />

    <div v-else-if="admins.length" class="sc-admins__list">
      <article v-for="admin in admins" :key="admin.userId" class="sc-admins__row">
        <span class="sc-admins__icon" :class="{ 'is-super': admin.isSuperAdmin }">
          <M3Icon :icon="admin.isSuperAdmin ? IconGavel : IconShieldPerson" :size="20" />
        </span>
        <div class="sc-admins__main">
          <p class="md-typescale-title-medium">
            {{ admin.username }}
            <span class="md-tag" :class="{ 'sc-admins__super': admin.isSuperAdmin }">
              {{ admin.isSuperAdmin ? '超级管理员' : '管理员' }}
            </span>
            <span v-if="admin.fromConfig" class="md-tag md-tag--outlined">配置白名单</span>
          </p>
          <p class="md-typescale-body-small sc-muted">
            <template v-if="admin.isSuperAdmin">拥有全部权限</template>
            <template v-else-if="admin.permissions.length">
              权限：{{ admin.permissions.map((key) => catalog.find((item) => item.key === key)?.label ?? key).join('、') }}
            </template>
            <template v-else>暂未授予任何具体权限</template>
            <template v-if="admin.grantedBy"> · 由 {{ admin.grantedBy }} 指定</template>
            <template v-if="admin.createdAt"> · {{ formatDateTime(admin.createdAt) }}</template>
          </p>
        </div>
        <div v-if="isSuperAdmin" class="sc-admins__actions">
          <M3Tooltip :text="admin.fromConfig ? '配置白名单里的超管不能在这里调整' : '调整角色与权限'">
            <span>
              <M3Button variant="tonal" size="sm" :disabled="admin.fromConfig" @click="openGrant(admin)">调整</M3Button>
            </span>
          </M3Tooltip>
          <M3Tooltip :text="admin.fromConfig ? '配置白名单里的超管无法在这里撤销' : '撤销管理员'">
            <span>
              <M3IconButton
                :icon="IconDelete"
                label="撤销管理员"
                variant="standard"
                :disabled="admin.fromConfig || busy === admin.id"
                @click="((confirmRemove = admin), (removeOpen = true))"
              />
            </span>
          </M3Tooltip>
        </div>
      </article>
    </div>

    <EmptyState v-else title="还没有管理员记录" description="配置白名单里的超管可以直接指定第一位管理员。" :icon="IconGavel" />

    <!-- 指定 / 调整 -->
    <M3Dialog v-model="grantOpen" title="指定管理员" :icon="IconPersonAdd">
      <label class="sc-admins__field">
        <span class="md-typescale-label-large">用户名或邮箱</span>
        <div class="sc-admins__search">
          <M3Icon :icon="IconSearch" :size="18" />
          <input
            v-model="keyword"
            class="md-typescale-body-medium"
            placeholder="输入后回车搜索"
            @keydown.enter.prevent="search"
          />
          <M3Button variant="text" size="sm" @click="search">搜索</M3Button>
        </div>
      </label>

      <ul v-if="candidates.length" class="sc-admins__candidates">
        <li v-for="user in candidates" :key="user.userId">
          <button
            type="button"
            class="sc-admins__candidate"
            :class="{ 'is-picked': picked?.userId === user.userId }"
            @click="choose(user)"
          >
            <span>{{ user.username }}</span>
            <span class="md-typescale-body-small sc-muted">
              {{ user.email ?? '无邮箱' }}
              <template v-if="user.currentRole"> · 已是{{ user.currentRole === 'super' ? '超级管理员' : '管理员' }}</template>
            </span>
          </button>
        </li>
      </ul>
      <p v-else-if="searched" class="md-typescale-body-small sc-muted">没有找到匹配的用户。</p>

      <p v-if="picked" class="md-typescale-body-medium">
        已选择：<b>{{ picked.username }}</b>
      </p>

      <label class="sc-admins__field">
        <span class="md-typescale-label-large">角色</span>
        <select v-model="role" class="sc-admins__select md-typescale-body-medium">
          <option value="admin">管理员（按权限开放）</option>
          <option value="super">超级管理员（全部权限，可管理管理员）</option>
        </select>
      </label>

      <div v-if="!isSuperRole" class="sc-admins__field">
        <span class="md-typescale-label-large">权限</span>
        <label v-for="item in catalog" :key="item.key" class="sc-admins__permission">
          <input type="checkbox" :checked="permissions.includes(item.key)" @change="togglePermission(item.key)" />
          <span>
            <b>{{ item.label }}</b>
            <span class="md-typescale-body-small sc-muted">{{ item.description }}</span>
          </span>
        </label>
      </div>
      <p v-else class="md-typescale-body-small sc-muted">超级管理员隐式拥有全部权限，并且可以管理其他管理员。</p>

      <template #actions>
        <M3Button variant="text" @click="grantOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="submitting" @click="submit">{{ submitting ? '保存中…' : '保存' }}</M3Button>
      </template>
    </M3Dialog>

    <M3Dialog v-model="removeOpen" title="撤销管理员？" :icon="IconDelete">
      <p class="md-typescale-body-medium">{{ confirmRemove?.username }} 将失去后台的全部权限。</p>
      <template #actions>
        <M3Button variant="text" @click="removeOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="busy !== null" @click="remove">确认撤销</M3Button>
      </template>
    </M3Dialog>
  </section>
</template>

<style scoped>
.sc-admin-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-block: 24px;
}

.sc-admins__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.sc-admins__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-admins__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-admins__icon {
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

.sc-admins__icon.is-super {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.sc-admins__main {
  flex: 1;
  min-width: 0;
}

.sc-admins__main p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-admins__super {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.sc-admins__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sc-admins__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block: 8px;
}

.sc-admins__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-inline: 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  height: 40px;
}

.sc-admins__search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.sc-admins__select {
  padding: 10px 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  font: inherit;
}

.sc-admins__candidates {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sc-admins__candidate {
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

.sc-admins__candidate:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.sc-admins__candidate.is-picked {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-admins__permission {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}

.sc-admins__permission span {
  display: flex;
  flex-direction: column;
}

/* 窄屏：操作按钮换到下一行，别再挤占用户信息那一列。
   与 .sc-review__row / .sc-plugins__row 用同一套处理方式。 */
@media (max-width: 719px) {
  .sc-admins__row {
    flex-wrap: wrap;
  }

  .sc-admins__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
