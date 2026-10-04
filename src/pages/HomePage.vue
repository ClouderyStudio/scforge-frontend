<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconArrowForward,
  IconCategory,
  IconCloudUpload,
  IconComment,
  IconDownload,
  IconForum,
  IconInventory2,
  IconSearch,
  IconShield,
  IconStorage,
  IconThumbUp,
  IconVerified,
} from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import PluginGrid from '@/components/plugin/PluginGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { pluginsApi } from '@/api/plugins'
import type { PluginSummary } from '@/api/types'
import { CATEGORIES } from '@/data/catalog'
import { formatCount } from '@/utils/format'

const router = useRouter()

const term = ref('')
const featured = ref<PluginSummary[]>([])
const featuredMods = ref<PluginSummary[]>([])
const recent = ref<PluginSummary[]>([])
const loading = ref(true)

const stats = computed(() => {
  const all = [...featured.value, ...featuredMods.value, ...recent.value]
  const downloads = all.reduce((sum, plugin) => sum + plugin.downloads, 0)
  const votes = all.reduce((sum, plugin) => sum + plugin.upvotes, 0)
  return { downloads, votes }
})

const highlights = [
  { icon: IconStorage, title: '插件与模组两块板', text: '插件是 .dll（只在服务端加载），模组是 .netmod（会下发给客户端），各自独立浏览与筛选。' },
  { icon: IconComment, title: '版本与文件管理', text: '每个资源可发布多个版本，区分正式版 / 测试版 / 预览版，附变更日志与兼容游戏版本。' },
  { icon: IconShield, title: '安全的上传与审核', text: '沿用云术统一身份登录，包体按 PE / 容器格式校验、先审后发，仅作者可维护自己的资源。' },
]

function search(): void {
  const q = term.value.trim()
  void router.push({ name: 'plugins', query: q ? { q } : {} })
}

onMounted(async () => {
  try {
    // 插件与模组各取一栏精选；「最近更新」是全局的（卡片上会标出模组）。
    const [pluginResult, modResult, recentResult] = await Promise.all([
      pluginsApi.featured(6, 'plugin'),
      pluginsApi.featured(6, 'mod'),
      pluginsApi.recent(8),
    ])
    featured.value = pluginResult.items
    featuredMods.value = modResult.items
    recent.value = recentResult.items
  } catch {
    featured.value = []
    featuredMods.value = []
    recent.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="sc-home">
    <section class="sc-hero">
      <div class="sc-hero__backdrop" aria-hidden="true" />
      <div class="sc-shell sc-hero__inner">
        <p class="sc-hero__eyebrow md-typescale-label-large">
          <M3Icon :icon="IconVerified" :size="16" />
          生存战争插件、模组资源平台
        </p>
        <h1 class="sc-hero__title md-typescale-display-small">
          为你的世界<br />找到 <span class="sc-hero__accent">合适的插件与模组</span>
        </h1>
        <p class="sc-hero__lede md-typescale-body-large">
          浏览社区发布的 SurvivalCraft 插件与模组，查看版本、兼容性与讨论；插件只在服务端生效，模组会下发到客户端。
        </p>

        <form class="sc-hero__search" role="search" @submit.prevent="search">
          <M3Icon :icon="IconSearch" :size="22" />
          <input
            v-model="term"
            class="sc-hero__input md-typescale-body-large"
            type="search"
            placeholder="搜索插件名称、作者或标签…（结果页可一键切到模组）"
            aria-label="搜索插件与模组"
          />
          <M3Button variant="filled" type="submit" :icon="IconSearch">搜索</M3Button>
        </form>

        <div class="sc-hero__stats">
          <div class="sc-hero__stat">
            <M3Icon :icon="IconDownload" :size="20" />
            <span class="md-typescale-title-medium">{{ formatCount(stats.downloads) }}</span>
            <span class="md-typescale-body-small sc-muted">累计下载</span>
          </div>
          <div class="sc-hero__stat">
            <M3Icon :icon="IconThumbUp" :size="20" />
            <span class="md-typescale-title-medium">{{ formatCount(stats.votes) }}</span>
            <span class="md-typescale-body-small sc-muted">社区赞同</span>
          </div>
          <div class="sc-hero__stat">
            <M3Icon :icon="IconCategory" :size="20" />
            <span class="md-typescale-title-medium">{{ CATEGORIES.length }}</span>
            <span class="md-typescale-body-small sc-muted">资源分类</span>
          </div>
        </div>
      </div>
    </section>

    <section class="sc-shell sc-section">
      <header class="sc-section__head">
        <div class="sc-section__title">
          <M3Icon :icon="IconVerified" :size="22" />
          <h2 class="md-typescale-headline-small">精选插件</h2>
          <span class="md-tag sc-section__note">仅服务端加载</span>
        </div>
        <M3Button variant="text" :trailing-icon="IconArrowForward" @click="router.push({ name: 'plugins' })">
          浏览全部
        </M3Button>
      </header>

      <LoadingSkeleton v-if="loading" :rows="3" />
      <PluginGrid v-else-if="featured.length" :plugins="featured" />
      <EmptyState
        v-else
        title="还没有精选插件"
        description="上传第一个插件，或浏览全部插件列表。"
        action-label="发布插件"
        @action="router.push({ name: 'upload' })"
      />
    </section>

    <section class="sc-shell sc-section">
      <header class="sc-section__head">
        <div class="sc-section__title">
          <M3Icon :icon="IconInventory2" :size="22" />
          <h2 class="md-typescale-headline-small">精选模组</h2>
          <span class="md-tag sc-section__note">会下发到客户端</span>
        </div>
        <M3Button variant="text" :trailing-icon="IconArrowForward" @click="router.push({ name: 'mods' })">
          浏览全部模组
        </M3Button>
      </header>

      <LoadingSkeleton v-if="loading" :rows="3" />
      <PluginGrid v-else-if="featuredMods.length" :plugins="featuredMods" />
      <EmptyState
        v-else
        title="还没有精选模组"
        description="模组会随服务器下发到客户端，也可以用来写插件逻辑；上传 .netmod 即可发布。"
        action-label="发布模组"
        @action="router.push({ name: 'upload', query: { kind: 'mod' } })"
      />
    </section>

    <section class="sc-shell sc-section">
      <header class="sc-section__head">
        <div class="sc-section__title">
          <M3Icon :icon="IconStorage" :size="22" />
          <h2 class="md-typescale-headline-small">最近更新</h2>
        </div>
        <M3Button
          variant="text"
          :trailing-icon="IconArrowForward"
          @click="router.push({ name: 'plugins', query: { sort: 'recent' } })"
        >
          查看全部更新
        </M3Button>
      </header>

      <LoadingSkeleton v-if="loading" :rows="3" />
      <PluginGrid v-else-if="recent.length" :plugins="recent" />
      <EmptyState v-else title="还没有插件" description="成为第一个发布者吧。" />
    </section>

    <section class="sc-shell sc-section">
      <header class="sc-section__head">
        <div class="sc-section__title">
          <M3Icon :icon="IconCloudUpload" :size="22" />
          <h2 class="md-typescale-headline-small">平台能力</h2>
        </div>
      </header>

      <div class="sc-highlights">
        <article v-for="item in highlights" :key="item.title" class="sc-highlight">
          <span class="sc-highlight__icon"><M3Icon :icon="item.icon" :size="24" /></span>
          <h3 class="md-typescale-title-medium">{{ item.title }}</h3>
          <p class="md-typescale-body-medium sc-muted">{{ item.text }}</p>
        </article>
      </div>

      <div class="sc-cta">
        <div>
          <h3 class="md-typescale-headline-small">有想分享的插件或模组？</h3>
          <p class="md-typescale-body-medium sc-muted">
            插件直接上传编译好的 .dll，模组上传 .netmod（会下发到客户端）；登录后即可发布，支持后续追加版本。
          </p>
        </div>
        <div class="sc-cta__actions">
          <M3Button variant="filled" :icon="IconCloudUpload" @click="router.push({ name: 'upload' })">
            发布资源
          </M3Button>
          <M3Button variant="outlined" :icon="IconForum" @click="router.push({ name: 'plugins' })">
            先看看别人的作品
          </M3Button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sc-section__note {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.sc-home {
  padding-block-end: 24px;
}

/* ---------- Hero ---------- */
.sc-hero {
  position: relative;
  overflow: hidden;
  padding-block: clamp(48px, 9vw, 96px) clamp(36px, 6vw, 64px);
}

.sc-hero__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 80% at 12% 8%, color-mix(in srgb, var(--md-sys-color-primary) 22%, transparent), transparent 70%),
    radial-gradient(48% 70% at 88% 12%, color-mix(in srgb, var(--md-sys-color-tertiary) 20%, transparent), transparent 72%),
    linear-gradient(180deg, var(--md-sys-color-surface-container-low), var(--md-sys-color-surface));
  pointer-events: none;
}

.sc-hero__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.sc-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding-inline: 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-hero__title {
  max-width: 20ch;
  font-family: var(--md-ref-typeface-brand);
}

.sc-hero__accent {
  color: var(--md-sys-color-primary);
}

.sc-hero__lede {
  max-width: 58ch;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-hero__search {
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(720px, 100%);
  margin-block-start: 8px;
  padding: 8px 8px 8px 18px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--scene-bg, var(--md-sys-color-surface-container-lowest));
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: var(--md-sys-elevation-level1);
}

.sc-hero__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.sc-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin-block-start: 12px;
}

.sc-hero__stat {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 0 8px;
  color: var(--md-sys-color-on-surface);
}

.sc-hero__stat .md-typescale-body-small {
  grid-column: 2;
}

/* ---------- Highlights ---------- */
.sc-highlights {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}

.sc-highlight {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-highlight__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

/* ---------- CTA ---------- */
.sc-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-block-start: 24px;
  padding: 24px;
  border-radius: var(--md-sys-shape-corner-extra-large);
  background: linear-gradient(
    120deg,
    var(--md-sys-color-primary-container),
    var(--md-sys-color-tertiary-container)
  );
  color: var(--md-sys-color-on-primary-container);
}

.sc-cta .sc-muted {
  color: inherit;
  opacity: 0.82;
  max-width: 52ch;
}

.sc-cta__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
