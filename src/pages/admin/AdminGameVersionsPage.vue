<script setup lang="ts">
/**
 * 游戏版本管理（仅超级管理员）。
 *
 * 生存战争每隔两三周就往前推一个版本，写死在代码里意味着每次都要改代码 + 发版；
 * 这里的列表就是权威来源：插件与版本的「兼容游戏版本」都以它为准。
 */
import { computed, onMounted, ref } from 'vue'
import { IconAdd, IconDelete, IconSchedule } from '@/icons'
import { M3Button, M3Icon, M3IconButton, M3Tooltip } from '@/components/m3'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { adminApi } from '@/api/admin'
import type { GameVersionOption } from '@/api/types'
import { useAdmin } from '@/composables/useAdmin'
import { useGameVersions } from '@/composables/useGameVersions'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatDateTime } from '@/utils/format'

const snackbar = useSnackbar()
const { isSuperAdmin } = useAdmin()
const { load: reloadPublic } = useGameVersions()

const items = ref<GameVersionOption[]>([])
const loading = ref(true)
const busy = ref<string | null>(null)
const draft = ref('')
const draftBeta = ref(false)
const submitting = ref(false)

const canSubmit = computed(() => draft.value.trim().length > 0 && !submitting.value)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await adminApi.listGameVersions()
    items.value = result.items
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function add(): Promise<void> {
  const version = draft.value.trim()
  if (!version) return

  submitting.value = true
  try {
    await adminApi.addGameVersion({ version, beta: draftBeta.value })
    snackbar.success(`已添加游戏版本 ${version}`)
    draft.value = ''
    draftBeta.value = false
    await load()
    // 发布页与筛选面板共用同一份缓存，这里强制刷新一次。
    await reloadPublic(true)
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '添加失败')
  } finally {
    submitting.value = false
  }
}

async function remove(item: GameVersionOption): Promise<void> {
  busy.value = item.id
  try {
    await adminApi.deleteGameVersion(item.id)
    snackbar.success(`已删除 ${item.version}`)
    await load()
    await reloadPublic(true)
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    busy.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="sc-admin-body">
    <p class="md-typescale-body-medium sc-muted">
      这里的列表是**权威来源**：发布插件 / 模组时能选的「兼容游戏版本」就是它。
      生存战争的版本号形如 <code>x26.07.01</code>，新版本还在内测时可以勾上「内测」。
    </p>

    <div v-if="isSuperAdmin" class="sc-gv__add">
      <label class="sc-gv__field">
        <span class="md-typescale-label-large">新增版本号</span>
        <input v-model="draft" class="sc-gv__input md-typescale-body-medium" placeholder="例如 x26.08.01" @keydown.enter.prevent="add" />
      </label>
      <label class="sc-gv__check md-typescale-body-medium">
        <input v-model="draftBeta" type="checkbox" />
        仍在内测
      </label>
      <M3Button variant="filled" :icon="IconAdd" :disabled="!canSubmit" @click="add">
        {{ submitting ? '添加中…' : '添加版本' }}
      </M3Button>
    </div>
    <p v-else class="md-typescale-body-small sc-muted">只有超级管理员可以添加或删除游戏版本。</p>

    <LoadingSkeleton v-if="loading" :rows="2" />

    <div v-else-if="items.length" class="sc-gv__list">
      <article v-for="item in items" :key="item.id" class="sc-gv__row">
        <span class="sc-gv__icon"><M3Icon :icon="IconSchedule" :size="20" /></span>
        <div class="sc-gv__main">
          <p class="md-typescale-title-medium">
            {{ item.version }}
            <span v-if="item.beta" class="md-tag sc-gv__beta">内测</span>
          </p>
          <p class="md-typescale-body-small sc-muted">
            {{ item.usageCount }} 个资源声明兼容 · {{ item.createdBy || '未知' }} 添加于 {{ formatDateTime(item.createdAt) }}
          </p>
        </div>
        <M3Tooltip v-if="isSuperAdmin" :text="item.usageCount > 0 ? '仍有资源声明兼容它，不能删除' : '删除这个版本'">
          <span>
            <M3IconButton
              :icon="IconDelete"
              label="删除游戏版本"
              variant="standard"
              :disabled="item.usageCount > 0 || busy === item.id"
              @click="remove(item)"
            />
          </span>
        </M3Tooltip>
      </article>
    </div>

    <EmptyState v-else title="还没有游戏版本" description="添加上第一个版本号，作者才能声明兼容性。" :icon="IconSchedule" />
  </section>
</template>

<style scoped>
.sc-admin-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-block: 24px;
}

.sc-gv__add {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-gv__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-gv__input {
  width: min(280px, 70vw);
  padding: 10px 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  font: inherit;
  outline: none;
}

.sc-gv__check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-block-end: 10px;
}

.sc-gv__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-gv__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-gv__icon {
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

.sc-gv__main {
  flex: 1;
  min-width: 0;
}

.sc-gv__main p {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sc-gv__beta {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
</style>
