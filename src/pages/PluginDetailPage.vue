<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowForward,
  IconBook,
  IconCode,
  IconDownload,
  IconEdit,
  IconLanguage,
  IconLink,
  IconOpenInNew,
    IconPublic,
  IconRefresh,
  IconSchedule,
  IconShare,
  IconStorage,
  IconTag,
  IconAdminPanelSettings,
  IconBlock,
  IconPendingActions,
  IconUploadFile,
} from '@/icons'
import { M3Button, M3Icon, M3IconButton, M3SegmentedButton, M3Tooltip } from '@/components/m3'
import PluginIcon from '@/components/plugin/PluginIcon.vue'
import VersionList from '@/components/plugin/VersionList.vue'
import ScMarkdown from '@/components/markdown/ScMarkdown.vue'
import CommentThread from '@/components/comment/CommentThread.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import VoteButtons from '@/components/ui/VoteButtons.vue'
import { pluginsApi, votesApi } from '@/api/plugins'
import { ApiError } from '@/api/http'
import type { Comment, PluginDetail, PluginVersion } from '@/api/types'
import { commentsApi } from '@/api/plugins'
import { boardRoute, CATEGORY_LABELS, editRoute, isModPackage, TAG_LABELS } from '@/data/catalog'
import { useAuth } from '@/composables/useAuth'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatBytes, formatCount, formatDate, formatDateTime, formatRelative } from '@/utils/format'
import { downloadFile } from '@/utils/download'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const snackbar = useSnackbar()

const plugin = ref<PluginDetail | null>(null)
const comments = ref<Comment[]>([])
const commentTotal = ref(0)
const loading = ref(true)
const commentsLoading = ref(true)
const notFound = ref(false)
const downloading = ref<string | null>(null)
const tab = ref('about')

const tabs = [
  { value: 'about', label: '描述' },
  { value: 'versions', label: '版本' },
  { value: 'comments', label: '评论' },
]

const slug = computed(() => String(route.params.slug ?? ''))
const latest = computed<PluginVersion | null>(() => plugin.value?.versions?.[0] ?? null)
const links = computed(() => {
  const item = plugin.value
  if (!item) return []
  return [
    { key: 'source', label: '源代码', url: item.sourceUrl, icon: IconCode },
    { key: 'issues', label: '问题反馈', url: item.issuesUrl, icon: IconLink },
    { key: 'license', label: item.license ?? '许可证', url: item.licenseUrl, icon: IconBook },
    { key: 'discord', label: 'Discord', url: item.discordUrl, icon: IconLanguage },
    { key: 'donation', label: '赞助作者', url: item.donationUrl, icon: IconStorage },
  ].filter((link) => Boolean(link.url))
})

async function load(): Promise<void> {
  loading.value = true
  notFound.value = false
  try {
    const result = await pluginsApi.detail(slug.value)
    plugin.value = result.addon
  } catch (error) {
    plugin.value = null
    if (error instanceof ApiError && error.status === 404) notFound.value = true
    else snackbar.error(error instanceof Error ? error.message : '加载插件失败')
  } finally {
    loading.value = false
  }
}

async function loadComments(): Promise<void> {
  if (!plugin.value) return
  commentsLoading.value = true
  try {
    const result = await commentsApi.list(plugin.value.id)
    comments.value = result.items
    commentTotal.value = result.total
  } catch {
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

async function refreshComments(): Promise<void> {
  await loadComments()
  if (plugin.value) plugin.value.commentCount = commentTotal.value
}

/** Optimistic vote: the UI flips immediately, then reconciles with the server. */
async function vote(direction: 1 | -1 | 0): Promise<void> {
  const item = plugin.value
  if (!item) return

  if (!isAuthenticated.value) {
    snackbar.show('请先登录后再投票')
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  const previous = { upvotes: item.upvotes, downvotes: item.downvotes, myVote: item.myVote }
  const next = { upvotes: item.upvotes, downvotes: item.downvotes, myVote: direction }
  if (previous.myVote === 1) next.upvotes -= 1
  if (previous.myVote === -1) next.downvotes -= 1
  if (direction === 1) next.upvotes += 1
  if (direction === -1) next.downvotes += 1
  Object.assign(item, next)

  try {
    const state = await (direction === 1
      ? votesApi.up(item.id)
      : direction === -1
        ? votesApi.down(item.id)
        : votesApi.clear(item.id))
    item.upvotes = state.upvotes
    item.downvotes = state.downvotes
    item.myVote = state.myVote
  } catch (error) {
    Object.assign(item, previous)
    snackbar.error(error instanceof Error ? error.message : '投票失败')
  }
}

async function download(version: PluginVersion): Promise<void> {
  if (!plugin.value) return
  downloading.value = version.id
  try {
    // 用服务端记录的原始上传文件名：单文件 .dll 之类不该被硬改成 .zip。
    await downloadFile(pluginsApi.downloadUrl(version.id), version.fileName)
    version.downloads += 1
    plugin.value.downloads += 1
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloading.value = null
  }
}

const resubmitting = ref(false)

/** 被驳回（或想让审核尽快重看）时，作者可以手动重新提交。 */
async function resubmit(): Promise<void> {
  const item = plugin.value
  if (!item) return
  resubmitting.value = true
  try {
    const result = await pluginsApi.resubmit(item.id)
    plugin.value = result.addon
    snackbar.success('已重新提交，等待审核')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '提交失败')
  } finally {
    resubmitting.value = false
  }
}

async function share(): Promise<void> {
  try {
    await navigator.clipboard.writeText(window.location.href)
    snackbar.success('链接已复制到剪贴板')
  } catch {
    snackbar.error('复制失败，请手动复制地址栏链接')
  }
}


watch(slug, async () => {
  tab.value = 'about'
  await load()
  await loadComments()
})

onMounted(async () => {
  await load()
  await loadComments()
})
</script>

<template>
  <div class="sc-detail">
    <LoadingSkeleton v-if="loading" class="sc-shell sc-detail__loading" :rows="3" />

    <EmptyState
      v-else-if="notFound || !plugin"
      title="插件不存在或已被删除"
      description="它可能已被作者下架，或者链接有误。"
      action-label="返回插件列表"
      @action="router.push(boardRoute(plugin?.kind))"
    />

    <template v-else>
      <!-- ---------- Hero ---------- -->
      <header class="sc-detail__hero">
        <div class="sc-detail__glow" aria-hidden="true" />
        <div class="sc-shell sc-detail__hero-inner">
          <div class="sc-detail__identity">
            <PluginIcon :src="plugin.iconUrl" :name="plugin.name" :size="96" />
            <div class="sc-detail__title-block">
              <p class="sc-detail__breadcrumb md-typescale-label-medium">
                <span class="md-tag">{{ CATEGORY_LABELS[plugin.category] ?? plugin.category }}</span>
                <span class="sc-muted">游戏版本 {{ plugin.gameVersion }}</span>
              </p>
              <h1 class="sc-detail__title md-typescale-headline-large">{{ plugin.name }}</h1>
              <p class="sc-detail__summary md-typescale-body-large">{{ plugin.summary }}</p>
              <p class="sc-detail__author md-typescale-body-medium sc-muted">
                由
                <RouterLink
                  class="sc-detail__author-link"
                  :to="{ ...boardRoute(plugin.kind), query: { q: plugin.author.username } }"
                >
                  {{ plugin.author.username }}
                </RouterLink>
                发布 · 更新于 {{ formatRelative(plugin.updatedAt) }}
              </p>
            </div>
          </div>

          <div class="sc-detail__cta">
            <M3Button
              v-if="latest"
              variant="filled"
              size="lg"
              :icon="IconDownload"
              :disabled="downloading === latest.id"
              @click="download(latest)"
            >
              {{ downloading === latest.id ? '下载中…' : `下载 ${latest.version}` }}
            </M3Button>
            <p v-if="latest" class="md-typescale-body-small sc-muted">
              {{ latest.fileName }} · {{ formatBytes(latest.fileSize) }} ·
              {{ formatCount(plugin.downloads) }} 次下载
            </p>
            <p v-if="latest && isModPackage(latest.fileName)" class="sc-detail__kind md-typescale-body-small">
              <M3Icon :icon="IconPublic" :size="14" />
              这是模组（.netmod）：安装后服务器会把它下发到客户端，请先确认玩家侧可以接受。
            </p>

            <div class="sc-detail__cta-row">
              <VoteButtons
                :upvotes="plugin.upvotes"
                :downvotes="plugin.downvotes"
                :vote="plugin.myVote"
                label="评分"
                @update:vote="vote"
              />
              <M3Tooltip text="复制链接">
                <M3IconButton :icon="IconShare" label="分享插件" variant="outlined" @click="share" />
              </M3Tooltip>
              <M3Button
                v-if="plugin.canManage"
                variant="outlined"
                size="sm"
                :icon="IconEdit"
                @click="router.push(editRoute(plugin.kind, plugin.slug))"
              >
                编辑插件
              </M3Button>
              <M3Button
                v-if="plugin.canManage"
                variant="outlined"
                size="sm"
                :icon="IconUploadFile"
                @click="router.push({ name: 'upload', query: { plugin: plugin.id } })"
              >
                发布新版本
              </M3Button>
              <M3Tooltip v-if="plugin.canManageContent || plugin.canReview" text="在管理后台处理该插件">
                <M3IconButton
                  :icon="IconAdminPanelSettings"
                  label="在管理后台处理该插件"
                  variant="outlined"
                  @click="router.push({ name: 'admin-plugins', query: { q: plugin.slug } })"
                />
              </M3Tooltip>
            </div>
          </div>
        </div>
      </header>

      <!-- ---------- 审核状态（作者与管理员可见） ---------- -->
      <div v-if="plugin.status !== 'published'" class="sc-shell sc-detail__notice-wrap">
        <div class="sc-review-notice" :class="`sc-review-notice--${plugin.status}`">
          <M3Icon :icon="plugin.status === 'pending' ? IconPendingActions : IconBlock" :size="20" />
          <div>
            <p class="md-typescale-title-small">
              {{ plugin.status === 'pending' ? '这个插件正在等待审核' : '这个插件未通过审核' }}
            </p>
            <p class="md-typescale-body-medium">
              {{
                plugin.status === 'pending'
                  ? '通过审核后才会出现在公开列表里；审核期间只有你与管理员能看到这一页。'
                  : '修正后可以重新提交审核，或直接点下方按钮再次提交。'
              }}
            </p>
            <p v-if="plugin.reviewNote" class="md-typescale-body-medium sc-review-notice__note">
              审核意见：{{ plugin.reviewNote }}
            </p>
          </div>
          <M3Button v-if="plugin.canManage" variant="tonal" size="sm" :disabled="resubmitting" @click="resubmit">
            重新提交审核
          </M3Button>
        </div>
      </div>

      <!-- ---------- Body ---------- -->
      <div class="sc-shell sc-detail__body">
        <div class="sc-detail__main">
          <M3SegmentedButton class="sc-detail__tabs" :options="tabs" :model-value="tab" aria-label="插件信息分区" @update:model-value="(v) => (tab = v)" />

          <!-- About -->
          <section v-if="tab === 'about'" class="sc-detail__panel">
            <ScMarkdown :source="plugin.description" />
            <ScMarkdown v-if="plugin.readme" :source="plugin.readme" />

            <div v-if="plugin.gallery.length" class="sc-detail__gallery">
              <img
                v-for="(image, index) in plugin.gallery"
                :key="image"
                :src="image"
                :alt="`${plugin.name} 截图 ${index + 1}`"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div class="sc-detail__tags">
              <span v-for="tag in plugin.tags" :key="tag" class="md-tag md-tag--outlined">
                <M3Icon :icon="IconTag" :size="12" />
                {{ TAG_LABELS[tag] ?? tag }}
              </span>
            </div>
          </section>

          <!-- Versions -->
          <section v-else-if="tab === 'versions'" class="sc-detail__panel">
            <VersionList
              :versions="plugin.versions"
              :downloading="downloading"
              :show-status="plugin.canManage || plugin.canReview || plugin.canManageContent"
              @download="download"
            />
            <EmptyState v-if="!plugin.versions.length" title="作者还没有发布版本" description="请稍后再来看看。" />
          </section>

          <!-- Comments -->
          <section v-else class="sc-detail__panel">
            <CommentThread
              :addon-id="plugin.id"
              :comments="comments"
              :total="commentTotal"
              :loading="commentsLoading"
              @refresh="refreshComments"
            />
          </section>
        </div>

        <!-- Sidebar -->
        <aside class="sc-detail__side">
          <section class="sc-side-card">
            <h2 class="sc-side-card__title md-typescale-title-small">
              <M3Icon :icon="IconStorage" :size="18" />
              统计
            </h2>
            <dl class="sc-side-list">
              <div>
                <dt>下载量</dt>
                <dd>{{ formatCount(plugin.downloads) }}</dd>
              </div>
              <div>
                <dt>赞同 / 反对</dt>
                <dd>{{ formatCount(plugin.upvotes) }} / {{ formatCount(plugin.downvotes) }}</dd>
              </div>
              <div>
                <dt>评论</dt>
                <dd>{{ formatCount(plugin.commentCount) }}</dd>
              </div>
              <div>
                <dt>版本数</dt>
                <dd>
                  {{ plugin.publishedVersionCount }}
                  <span v-if="plugin.versionCount > plugin.publishedVersionCount" class="sc-muted">
                    / {{ plugin.versionCount }}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section class="sc-side-card">
            <h2 class="sc-side-card__title md-typescale-title-small">
              <M3Icon :icon="IconSchedule" :size="18" />
              时间线
            </h2>
            <dl class="sc-side-list">
              <div>
                <dt>首次发布</dt>
                <dd>{{ formatDate(plugin.publishedAt) }}</dd>
              </div>
              <div>
                <dt>最近更新</dt>
                <dd>{{ formatDateTime(plugin.updatedAt) }}</dd>
              </div>
              <div v-if="latest">
                <dt>最新版本</dt>
                <dd>{{ latest.version }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="links.length" class="sc-side-card">
            <h2 class="sc-side-card__title md-typescale-title-small">
              <M3Icon :icon="IconLink" :size="18" />
              相关链接
            </h2>
            <ul class="sc-side-links">
              <li v-for="link in links" :key="link.key">
                <a class="sc-side-link" :href="link.url ?? '#'" target="_blank" rel="noopener noreferrer">
                  <M3Icon :icon="link.icon" :size="18" />
                  <span>{{ link.label }}</span>
                  <M3Icon :icon="IconOpenInNew" :size="14" class="sc-side-link__out" />
                </a>
              </li>
            </ul>
          </section>

          <section class="sc-side-card sc-side-card--muted">
            <h2 class="sc-side-card__title md-typescale-title-small">
              <M3Icon :icon="IconRefresh" :size="18" />
              关于 SCForge
            </h2>
            <p class="md-typescale-body-small sc-muted">
              插件由社区作者上传，平台仅做基础校验。安装前请确认兼容的游戏版本，并备份服务器存档。
            </p>
            <M3Button variant="text" size="sm" :trailing-icon="IconArrowForward" @click="router.push(boardRoute(plugin.kind))">
              浏览更多插件
            </M3Button>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sc-detail__loading {
  padding-block: 40px;
}

/* ---------- Hero ---------- */
.sc-detail__hero {
  position: relative;
  overflow: hidden;
  padding-block: 40px 32px;
  border-block-end: 1px solid var(--md-sys-color-outline-variant);
}

.sc-detail__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(42% 70% at 14% 0%, color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent), transparent 70%),
    linear-gradient(180deg, var(--md-sys-color-surface-container-low), var(--md-sys-color-surface));
  pointer-events: none;
}

.sc-detail__hero-inner {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
}

.sc-detail__identity {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.sc-detail__title-block {
  min-width: 0;
}

.sc-detail__breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block-end: 8px;
}

.sc-detail__title {
  font-family: var(--md-ref-typeface-brand);
  /* 资源名里可能有超长的英文/下划线串，不允许它把 hero 顶宽（hero 会直接裁掉）。 */
  overflow-wrap: anywhere;
}

.sc-detail__summary {
  max-width: 62ch;
  margin-block-start: 6px;
  color: var(--md-sys-color-on-surface-variant);
  overflow-wrap: anywhere;
}

.sc-detail__author {
  margin-block-start: 8px;
}

.sc-detail__author-link {
  color: var(--md-sys-color-primary);
}

.sc-detail__cta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  /* 不设上限时，这一列的最大内容宽度（模组提示那一整句）会成为整块 CTA 的宽度，
     把 hero 撑破；hero 又是 overflow:hidden，多出来的部分会被静默切掉。 */
  max-width: 100%;
}

.sc-detail__kind {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-block-start: 6px;
  padding: 8px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-detail__cta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 手机上「评分 + 分享 + 编辑 + 发版」挤不进一行，必须允许换行；
     否则这一行的最小内容宽度会直接决定整块 CTA 的宽度。 */
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ---------- Body ---------- */
.sc-detail__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--sc-sidebar-width);
  gap: 32px;
  padding-block: 28px 64px;
  align-items: start;
}

.sc-detail__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sc-detail__panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sc-detail__prose {
  color: var(--md-sys-color-on-surface);
  overflow-wrap: anywhere;
}

.sc-detail__prose :deep(p) {
  margin: 0 0 12px;
}

.sc-detail__prose :deep(a) {
  color: var(--md-sys-color-primary);
}

.sc-detail__prose :deep(code) {
  padding: 2px 6px;
  border-radius: var(--md-sys-shape-corner-extra-small);
  background-color: var(--md-sys-color-surface-container-highest);
  font-family: var(--md-ref-typeface-mono);
  font-size: 0.9em;
}

.sc-detail__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 10px;
}

.sc-detail__gallery img {
  width: 100%;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-high);
}

.sc-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ---------- Sidebar ---------- */
.sc-detail__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  inset-block-start: calc(var(--sc-header-height) + 16px);
}

.sc-side-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-side-card--muted {
  background-color: var(--md-sys-color-surface-container);
  box-shadow: none;
}

.sc-side-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--md-typescale-title-small-weight);
}

.sc-side-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.sc-side-list > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.sc-side-list dt {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-medium-size);
}

.sc-side-list dd {
  margin: 0;
  font-size: var(--md-sys-typescale-body-medium-size);
  font-weight: 500;
}

.sc-side-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.sc-side-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface);
  font-size: var(--md-sys-typescale-body-medium-size);
}

@media (hover: hover) {
  .sc-side-link:hover {
    background-color: var(--md-sys-color-surface-container-high);
  }
}

.sc-side-link__out {
  margin-inline-start: auto;
  color: var(--md-sys-color-on-surface-variant);
}

@media (max-width: 1023px) {
  .sc-detail__body {
    grid-template-columns: 1fr;
  }

  .sc-detail__side {
    position: static;
  }

  .sc-detail__cta {
    align-items: flex-start;
  }
}
</style>
