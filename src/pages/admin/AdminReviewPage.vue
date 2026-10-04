<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconCheckCircle,
  IconGavel,
  IconOpenInNew,
  IconPendingActions,
  IconRefresh,
  IconStorage,
} from '@/icons'
import { M3Button, M3Dialog, M3Icon, M3IconButton, M3SegmentedButton, M3Tooltip } from '@/components/m3'
import PluginIcon from '@/components/plugin/PluginIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import ScPagination from '@/components/ui/ScPagination.vue'
import { adminApi } from '@/api/admin'
import type { PluginSummary, PluginVersion } from '@/api/types'
import { CATEGORY_LABELS, CHANNEL_LABELS, detailRoute, KIND_LABELS } from '@/data/catalog'
import { CONTENT_STATUS_LABELS, REVIEW_STATUS_OPTIONS } from '@/data/review'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatBytes, formatDateTime, formatRelative } from '@/utils/format'

const router = useRouter()
const snackbar = useSnackbar()

const tab = ref('plugins')
const status = ref('pending')
const page = ref(1)
const plugins = ref<PluginSummary[]>([])
const versions = ref<PluginVersion[]>([])
const total = ref(0)
const totalPages = ref(1)
const loading = ref(true)
const busy = ref<string | null>(null)

/** 审核对话框：approve/reject + 理由。 */
const reviewOpen = ref(false)
const reviewTarget = ref<{ kind: 'plugin' | 'version'; id: string; name: string } | null>(null)
const reviewApprove = ref(true)
const reviewNote = ref('')

const tabs = [
  { value: 'plugins', label: '插件提交' },
  { value: 'versions', label: '版本文件' },
]

const activeCount = computed(() => total.value)

async function load(): Promise<void> {
  loading.value = true
  try {
    if (tab.value === 'plugins') {
      const result = await adminApi.reviewPlugins({ status: status.value, page: page.value, pageSize: 20 })
      plugins.value = result.items
      total.value = result.total
      totalPages.value = result.totalPages
    } else {
      const result = await adminApi.reviewVersions({ status: status.value, page: page.value, pageSize: 20 })
      versions.value = result.items
      total.value = result.total
      totalPages.value = result.totalPages
    }
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openReview(kind: 'plugin' | 'version', id: string, name: string, approve: boolean): void {
  reviewTarget.value = { kind, id, name }
  reviewApprove.value = approve
  reviewNote.value = ''
  reviewOpen.value = true
}

async function submitReview(): Promise<void> {
  const target = reviewTarget.value
  if (!target) return
  if (!reviewApprove.value && !reviewNote.value.trim()) {
    snackbar.error('驳回时必须填写理由')
    return
  }

  busy.value = target.id
  try {
    const body = { approve: reviewApprove.value, note: reviewNote.value.trim() || null }
    if (target.kind === 'plugin') await adminApi.reviewPlugin(target.id, body)
    else await adminApi.reviewVersion(target.id, body)
    snackbar.success(reviewApprove.value ? '已通过' : '已驳回')
    reviewOpen.value = false
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    busy.value = null
  }
}

function switchTab(value: string): void {
  tab.value = value
  page.value = 1
  void load()
}

function switchStatus(value: string): void {
  status.value = value
  page.value = 1
  void load()
}

onMounted(load)
</script>

<template>
  <section class="sc-admin-body">
    <header class="sc-review__head">
      <M3SegmentedButton :options="tabs" :model-value="tab" aria-label="审核类型" @update:model-value="switchTab" />
      <div class="sc-review__filters">
        <M3SegmentedButton
          :options="REVIEW_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))"
          :model-value="status"
          aria-label="状态筛选"
          @update:model-value="switchStatus"
        />
        <M3Tooltip text="刷新">
          <M3IconButton :icon="IconRefresh" label="刷新" variant="standard" @click="load" />
        </M3Tooltip>
      </div>
    </header>

    <p class="md-typescale-body-medium sc-muted">
      共 <b>{{ activeCount }}</b> 条「{{ CONTENT_STATUS_LABELS[status as 'pending' | 'published' | 'rejected'] }}」记录。
      驳回时必须写明理由 —— 那段文字会直接展示给作者。
    </p>

    <LoadingSkeleton v-if="loading" :rows="3" />

    <!-- 插件队列 -->
    <template v-else-if="tab === 'plugins'">
      <div v-if="plugins.length" class="sc-review__list">
        <article v-for="plugin in plugins" :key="plugin.id" class="sc-review__row">
          <PluginIcon :src="plugin.iconUrl" :name="plugin.name" :size="48" />
          <div class="sc-review__main">
            <p class="md-typescale-title-medium">
              {{ plugin.name }}
              <span class="md-tag md-tag--outlined">{{ KIND_LABELS[plugin.kind] }}</span>
              <span class="md-tag md-tag--outlined">{{ CATEGORY_LABELS[plugin.category] ?? plugin.category }}</span>
              <span class="md-tag" :class="`sc-status sc-status--${plugin.status}`">
                {{ CONTENT_STATUS_LABELS[plugin.status] }}
              </span>
            </p>
            <p class="md-typescale-body-medium sc-muted sc-clamp-2">{{ plugin.summary }}</p>
            <p class="md-typescale-body-small sc-muted">
              作者 {{ plugin.author.username }} · {{ plugin.publishedVersionCount }}/{{ plugin.versionCount }} 个版本已发布 ·
              提交于 {{ formatRelative(plugin.publishedAt) }} · 更新于 {{ formatRelative(plugin.updatedAt) }}
            </p>
            <p v-if="plugin.reviewNote" class="sc-review__note md-typescale-body-small">
              上次审核意见：{{ plugin.reviewNote }}
              <template v-if="plugin.reviewedBy">（{{ plugin.reviewedBy }}）</template>
            </p>
          </div>
          <div class="sc-review__actions">
            <M3Tooltip text="查看完整内容">
              <M3IconButton
                :icon="IconOpenInNew"
                label="查看完整内容"
                variant="standard"
                @click="router.push(detailRoute(plugin.kind, plugin.slug))"
              />
            </M3Tooltip>
            <M3Button
              v-if="plugin.status !== 'published'"
              variant="filled"
              size="sm"
              :icon="IconCheckCircle"
              :disabled="busy === plugin.id"
              @click="openReview('plugin', plugin.id, plugin.name, true)"
            >
              通过
            </M3Button>
            <M3Button
              v-if="plugin.status !== 'rejected'"
              variant="text"
              size="sm"
              :disabled="busy === plugin.id"
              @click="openReview('plugin', plugin.id, plugin.name, false)"
            >
              驳回
            </M3Button>
          </div>
        </article>
      </div>
      <EmptyState v-else title="这个状态下没有插件" description="换个状态看看，或稍后再来。" :icon="IconGavel" />
    </template>

    <!-- 版本队列 -->
    <template v-else>
      <div v-if="versions.length" class="sc-review__list">
        <article v-for="version in versions" :key="version.id" class="sc-review__row">
          <span class="sc-review__version-icon"><M3Icon :icon="IconStorage" :size="22" /></span>
          <div class="sc-review__main">
            <p class="md-typescale-title-medium">
              {{ version.pluginName }} · {{ version.version }}
              <span class="md-tag md-tag--outlined">{{ KIND_LABELS[version.pluginKind] }}</span>
              <span class="md-tag md-tag--outlined">{{ CHANNEL_LABELS[version.channel] ?? version.channel }}</span>
              <span class="md-tag" :class="`sc-status sc-status--${version.status}`">
                {{ CONTENT_STATUS_LABELS[version.status] }}
              </span>
            </p>
            <p class="md-typescale-body-small sc-muted">
              {{ version.fileName }} · {{ formatBytes(version.fileSize) }} · 兼容
              {{ version.gameVersions.join(', ') || version.gameVersion }} · 提交于
              {{ formatDateTime(version.publishedAt) }}
            </p>
            <p v-if="version.changelog" class="md-typescale-body-medium sc-muted sc-clamp-2">{{ version.changelog }}</p>
            <p v-if="version.reviewNote" class="sc-review__note md-typescale-body-small">
              上次审核意见：{{ version.reviewNote }}
            </p>
          </div>
          <div class="sc-review__actions">
            <M3Tooltip text="打开插件详情">
              <M3IconButton
                :icon="IconOpenInNew"
                label="打开插件详情"
                variant="standard"
                @click="router.push(detailRoute(version.pluginKind, version.pluginSlug))"
              />
            </M3Tooltip>
            <M3Button
              v-if="version.status !== 'published'"
              variant="filled"
              size="sm"
              :icon="IconCheckCircle"
              :disabled="busy === version.id"
              @click="openReview('version', version.id, `${version.pluginName} ${version.version}`, true)"
            >
              通过
            </M3Button>
            <M3Button
              v-if="version.status !== 'rejected'"
              variant="text"
              size="sm"
              :disabled="busy === version.id"
              @click="openReview('version', version.id, `${version.pluginName} ${version.version}`, false)"
            >
              驳回
            </M3Button>
          </div>
        </article>
      </div>
      <EmptyState v-else title="这个状态下没有版本" description="换个状态看看，或稍后再来。" :icon="IconPendingActions" />
    </template>

    <ScPagination v-if="!loading && totalPages > 1" :page="page" :total-pages="totalPages" @update:page="(value) => { page = value; load() }" />

    <M3Dialog
      v-model="reviewOpen"
      :title="reviewApprove ? '确认通过审核？' : '驳回这次提交'"
      :icon="reviewApprove ? IconCheckCircle : IconGavel"
    >
      <p class="md-typescale-body-medium">{{ reviewTarget?.name }}</p>
      <p v-if="reviewApprove" class="md-typescale-body-medium sc-muted">
        通过后即可对公众可见（插件还需至少有一个已通过的版本）。
      </p>
      <label class="sc-review__field">
        <span class="md-typescale-label-large">{{ reviewApprove ? '备注（可选）' : '驳回理由（必填）' }}</span>
        <textarea
          v-model="reviewNote"
          class="sc-review__textarea md-typescale-body-medium"
          rows="4"
          :placeholder="reviewApprove ? '例如：已确认无恶意行为' : '例如：简介里缺少安装说明'"
        />
      </label>
      <p class="md-typescale-body-small sc-muted">理由会直接展示给作者，请写具体一点。</p>

      <template #actions>
        <M3Button variant="text" @click="reviewOpen = false">取消</M3Button>
        <M3Button variant="filled" :disabled="busy !== null" @click="submitReview">
          {{ reviewApprove ? '确认通过' : '确认驳回' }}
        </M3Button>
      </template>
    </M3Dialog>
  </section>
</template>

<style scoped>
.sc-admin-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-block: 24px;
}

.sc-review__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.sc-review__filters {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-review__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sc-review__row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-review__version-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
}

.sc-review__main {
  flex: 1;
  min-width: 0;
}

.sc-review__main p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-review__note {
  margin-block-start: 6px;
  color: var(--md-sys-color-error);
}

.sc-review__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sc-review__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block-start: 8px;
}

.sc-review__textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  font: inherit;
  resize: vertical;
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

@media (max-width: 719px) {
  .sc-review__row {
    flex-wrap: wrap;
  }

  .sc-review__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
