<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconDelete, IconEdit, IconOpenInNew, IconSearch, IconStorage } from '@/icons'
import { M3Button, M3Dialog, M3Icon, M3IconButton, M3SegmentedButton, M3Tooltip } from '@/components/m3'
import PluginIcon from '@/components/plugin/PluginIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import ScPagination from '@/components/ui/ScPagination.vue'
import { adminApi } from '@/api/admin'
import type { PluginSummary } from '@/api/types'
import { CATEGORY_LABELS, detailRoute, editRoute, KIND_LABELS } from '@/data/catalog'
import { CONTENT_STATUS_LABELS, REVIEW_STATUS_OPTIONS } from '@/data/review'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatCount, formatRelative } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const snackbar = useSnackbar()

const term = ref(typeof route.query.q === 'string' ? route.query.q : '')
const status = ref('')
const page = ref(1)
const items = ref<PluginSummary[]>([])
const total = ref(0)
const totalPages = ref(1)
const loading = ref(true)
const busy = ref<string | null>(null)
const confirmDelete = ref<PluginSummary | null>(null)

const statusOptions = [{ value: '', label: '全部' }, ...REVIEW_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]

const deleteOpen = ref(false)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await adminApi.allPlugins({
      q: term.value.trim() || undefined,
      status: status.value || undefined,
      page: page.value,
      pageSize: 20,
    })
    items.value = result.items
    total.value = result.total
    totalPages.value = result.totalPages
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function switchStatus(value: string): void {
  status.value = value
  page.value = 1
  void load()
}

function askDelete(plugin: PluginSummary): void {
  confirmDelete.value = plugin
  deleteOpen.value = true
}

async function remove(): Promise<void> {
  const plugin = confirmDelete.value
  if (!plugin) return
  busy.value = plugin.id
  try {
    await adminApi.deletePlugin(plugin.id)
    snackbar.success('插件已删除')
    deleteOpen.value = false
    await load()
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
    <div class="sc-plugins__bar">
      <form class="sc-plugins__search" role="search" @submit.prevent="search">
        <M3Icon :icon="IconSearch" :size="18" />
        <input v-model="term" class="md-typescale-body-medium" type="search" placeholder="按名称 / slug / 作者搜索…" />
        <M3Button variant="text" size="sm" type="submit">搜索</M3Button>
      </form>
      <M3SegmentedButton :options="statusOptions" :model-value="status" aria-label="状态筛选" @update:model-value="switchStatus" />
    </div>

    <p class="md-typescale-body-medium sc-muted">
      共 {{ total }} 个插件。内容管理权限可以编辑任意插件的资料、删除插件；审核请走「审核队列」。
    </p>

    <LoadingSkeleton v-if="loading" :rows="3" />

    <div v-else-if="items.length" class="sc-plugins__list">
      <article v-for="plugin in items" :key="plugin.id" class="sc-plugins__row">
        <PluginIcon :src="plugin.iconUrl" :name="plugin.name" :size="44" />
        <div class="sc-plugins__main">
          <p class="md-typescale-title-medium">
            {{ plugin.name }}
            <span class="md-tag md-tag--outlined">{{ KIND_LABELS[plugin.kind] }}</span>
            <span class="md-tag" :class="`sc-status sc-status--${plugin.status}`">
              {{ CONTENT_STATUS_LABELS[plugin.status] }}
            </span>
            <span class="md-tag md-tag--outlined">{{ CATEGORY_LABELS[plugin.category] ?? plugin.category }}</span>
          </p>
          <p class="md-typescale-body-small sc-muted">
            /{{ plugin.slug }} · 作者 {{ plugin.author.username }} · {{ plugin.publishedVersionCount }}/{{ plugin.versionCount }} 版本 ·
            {{ formatCount(plugin.downloads) }} 下载 · 更新于 {{ formatRelative(plugin.updatedAt) }}
          </p>
        </div>
        <div class="sc-plugins__actions">
          <M3Button
            variant="tonal"
            size="sm"
            :icon="IconEdit"
            @click="router.push(editRoute(plugin.kind, plugin.slug))"
          >
            编辑
          </M3Button>
          <M3Tooltip text="打开详情页">
            <M3IconButton
              :icon="IconOpenInNew"
              label="打开详情页"
              variant="standard"
              @click="router.push(detailRoute(plugin.kind, plugin.slug))"
            />
          </M3Tooltip>
          <M3Tooltip text="删除插件">
            <M3IconButton
              :icon="IconDelete"
              label="删除插件"
              variant="standard"
              :disabled="busy === plugin.id"
              @click="askDelete(plugin)"
            />
          </M3Tooltip>
        </div>
      </article>
    </div>

    <EmptyState v-else title="没有匹配的插件" description="换个关键词或状态试试。" :icon="IconStorage" />

    <ScPagination
      v-if="!loading && totalPages > 1"
      :page="page"
      :total-pages="totalPages"
      @update:page="(value) => { page = value; load() }"
    />

    <M3Dialog v-model="deleteOpen" title="删除这个插件？" :icon="IconDelete">
      <p class="md-typescale-body-medium">{{ confirmDelete?.name }}（/{{ confirmDelete?.slug }}）</p>
      <p class="md-typescale-body-medium sc-muted">
        会连同它的全部版本、评论与投票一起删除，且无法恢复。如果只是内容有问题，建议驳回或编辑而不是删除。
      </p>
      <template #actions>
        <M3Button variant="text" @click="deleteOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="busy !== null" @click="remove">确认删除</M3Button>
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

.sc-plugins__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.sc-plugins__search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: min(420px, 100%);
  height: 44px;
  padding-inline: 14px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-plugins__search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.sc-plugins__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-plugins__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-plugins__main {
  flex: 1;
  min-width: 0;
}

.sc-plugins__main p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-plugins__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sc-status--pending {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-status--published {
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.sc-status--rejected {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}
</style>
