<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconAdd,
  IconComment,
  IconDownload,
  IconEdit,
  IconOpenInNew,
  IconPendingActions,
  IconStorage,
  IconThumbUp,
} from '@/icons'
import { M3Button, M3Icon, M3IconButton, M3Tooltip } from '@/components/m3'
import PluginIcon from '@/components/plugin/PluginIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { mineApi, pluginsApi } from '@/api/plugins'
import type { PluginSummary, UploadSummary } from '@/api/types'
import { useAuth } from '@/composables/useAuth'
import { useSnackbar } from '@/composables/useSnackbar'
import { CATEGORY_LABELS, detailRoute, editRoute, KIND_LABELS } from '@/data/catalog'
import { CONTENT_STATUS_LABELS } from '@/data/review'
import { formatCount, formatRelative } from '@/utils/format'

const router = useRouter()
const { user } = useAuth()
const snackbar = useSnackbar()

const plugins = ref<PluginSummary[]>([])
const summary = ref<UploadSummary>({
  addons: 0,
  downloads: 0,
  upvotes: 0,
  comments: 0,
  pending: 0,
  published: 0,
  rejected: 0,
})
const loading = ref(true)
const busy = ref<string | null>(null)

const cards = computed(() => [
  { key: 'plugins', label: '已提交资源', value: summary.value.addons, icon: IconStorage },
  { key: 'pending', label: '待审核', value: summary.value.pending, icon: IconPendingActions },
  { key: 'published', label: '已发布', value: summary.value.published, icon: IconDownload },
  { key: 'downloads', label: '累计下载', value: summary.value.downloads, icon: IconThumbUp },
  { key: 'comments', label: '收到评论', value: summary.value.comments, icon: IconComment },
])

async function refresh(): Promise<void> {
  const [list, stats] = await Promise.all([mineApi.list(), mineApi.summary()])
  plugins.value = list.items
  summary.value = stats
}

async function resubmit(plugin: PluginSummary): Promise<void> {
  busy.value = plugin.id
  try {
    await pluginsApi.resubmit(plugin.id)
    snackbar.success('已重新提交，等待审核')
    await refresh()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '提交失败')
  } finally {
    busy.value = null
  }
}

onMounted(async () => {
  try {
    await refresh()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="sc-dash sc-shell">
    <header class="sc-dash__head">
      <div>
        <h1 class="md-typescale-headline-medium">我的插件</h1>
        <p class="md-typescale-body-large sc-muted">
          {{ user?.username }} 的创作空间 —— 提交的插件需要管理员审核通过后才会对公众可见。
        </p>
      </div>
      <M3Button variant="filled" :icon="IconAdd" @click="router.push({ name: 'upload' })">发布新插件</M3Button>
    </header>

    <section class="sc-dash__stats">
      <article v-for="card in cards" :key="card.key" class="sc-dash__stat">
        <span class="sc-dash__stat-icon"><M3Icon :icon="card.icon" :size="20" /></span>
        <p class="md-typescale-headline-small">{{ formatCount(card.value) }}</p>
        <p class="md-typescale-body-medium sc-muted">{{ card.label }}</p>
      </article>
    </section>

    <section class="sc-dash__list">
      <LoadingSkeleton v-if="loading" :rows="3" />

      <template v-else-if="plugins.length">
        <article v-for="plugin in plugins" :key="plugin.id" class="sc-dash__row">
          <PluginIcon :src="plugin.iconUrl" :name="plugin.name" :size="56" />
          <div class="sc-dash__row-main">
            <p class="md-typescale-title-medium">
              {{ plugin.name }}
              <span class="md-tag md-tag--outlined">{{ KIND_LABELS[plugin.kind] }}</span>
              <span class="md-tag" :class="`sc-status sc-status--${plugin.status}`">
                {{ CONTENT_STATUS_LABELS[plugin.status] }}
              </span>
              <span class="md-tag md-tag--outlined">{{ CATEGORY_LABELS[plugin.category] ?? plugin.category }}</span>
            </p>
            <p class="md-typescale-body-medium sc-muted sc-clamp-2">{{ plugin.summary }}</p>
            <p class="md-typescale-body-small sc-muted">
              {{ plugin.publishedVersionCount }} / {{ plugin.versionCount }} 个版本已发布 ·
              {{ formatCount(plugin.downloads) }} 次下载 · {{ formatCount(plugin.upvotes) }} 赞同 ·
              {{ formatCount(plugin.commentCount) }} 评论 · {{ formatRelative(plugin.updatedAt) }}更新
            </p>
            <p v-if="plugin.status === 'rejected' && plugin.reviewNote" class="sc-dash__note md-typescale-body-small">
              驳回理由：{{ plugin.reviewNote }}
            </p>
          </div>
          <div class="sc-dash__row-actions">
            <M3Button
              variant="tonal"
              size="sm"
              :icon="IconEdit"
              @click="router.push(editRoute(plugin.kind, plugin.slug))"
            >
              编辑
            </M3Button>
            <M3Button
              v-if="plugin.status === 'rejected'"
              variant="text"
              size="sm"
              :disabled="busy === plugin.id"
              @click="resubmit(plugin)"
            >
              重新提交
            </M3Button>
            <M3Tooltip text="查看详情页">
              <M3IconButton
                :icon="IconOpenInNew"
                label="查看详情页"
                variant="standard"
                @click="router.push(detailRoute(plugin.kind, plugin.slug))"
              />
            </M3Tooltip>
          </div>
        </article>
      </template>

      <EmptyState
        v-else
        :icon="IconEdit"
        title="还没有提交过插件"
        description="把你的作品发布到 SCForge，审核通过后其他服主就能看到它。"
        action-label="发布插件"
        @action="router.push({ name: 'upload' })"
      />
    </section>
  </div>
</template>

<style scoped>
.sc-dash {
  padding-block: 32px 72px;
}

.sc-dash__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-block-end: 20px;
}

.sc-dash__head h1 {
  font-family: var(--md-ref-typeface-brand);
}

.sc-dash__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: 12px;
  margin-block-end: 24px;
}

.sc-dash__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-dash__stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-block-end: 4px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-dash__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sc-dash__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-dash__row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sc-dash__row-main .md-typescale-title-medium {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sc-dash__note {
  margin-block-start: 4px;
  color: var(--md-sys-color-error);
}

.sc-dash__row-actions {
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

@media (max-width: 719px) {
  .sc-dash__row {
    flex-wrap: wrap;
  }

  .sc-dash__row-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
