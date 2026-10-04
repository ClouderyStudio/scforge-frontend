<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconClose, IconDeployedCode, IconFilterList, IconInventory2, IconRefresh, IconSearch, IconSort, IconTune } from '@/icons'
import { M3Button, M3Icon, M3IconButton, M3Menu, M3MenuItem, M3SegmentedButton, M3Sheet, M3Tooltip } from '@/components/m3'
import PluginGrid from '@/components/plugin/PluginGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import ScPagination from '@/components/ui/ScPagination.vue'
import { pluginsApi } from '@/api/plugins'
import type { PluginSummary, ResourceKind, SearchFacets, SortKey } from '@/api/types'
import { boardRoute, CATEGORIES, GAME_VERSIONS, KINDS, kindOption, SORT_OPTIONS, TAG_LABELS, TAGS } from '@/data/catalog'
import { useGameVersions } from '@/composables/useGameVersions'
import { ApiError } from '@/api/http'
import { useSnackbar } from '@/composables/useSnackbar'

const route = useRoute()
const router = useRouter()
const snackbar = useSnackbar()

const plugins = ref<PluginSummary[]>([])
const facets = ref<SearchFacets>({ kinds: [], categories: [], tags: [], gameVersions: [] })
const total = ref(0)
const totalPages = ref(1)
const loading = ref(true)
const filtersOpen = ref(false)
const term = ref('')

const PAGE_SIZE = 24

/* ---------- 板块：插件 / 模组（由路由 meta 决定，URL 可分享） ---------- */

const boardKind = computed<ResourceKind>(() => (route.meta.kind as ResourceKind | undefined) ?? 'plugin')
const currentBoard = computed(() => kindOption(boardKind.value))

/** 板块切换器：计数来自服务端 facets（全局口径，不受当前筛选影响）。 */
const boardOptions = computed(() =>
  KINDS.map((board) => ({
    ...board,
    count: facets.value.kinds.find((item) => item.key === board.key)?.count ?? 0,
    icon: board.key === 'mod' ? IconInventory2 : IconDeployedCode,
  })),
)

/** 换板时保留搜索词与筛选，只是换一个 URL 前缀。 */
function switchBoard(kind: ResourceKind): void {
  if (kind === boardKind.value) return
  void router.push({ name: boardRoute(kind).name, query: route.query })
}

/* ---------- Query state (the URL is the source of truth) ---------- */

function queryString(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

const q = computed(() => queryString('q'))
const category = computed(() => queryString('category'))
const tag = computed(() => queryString('tag'))
const gameVersion = computed(() => queryString('gameVersion'))
const sort = computed<SortKey>(() => {
  const value = queryString('sort')
  return (['relevance', 'downloads', 'recent', 'name'] as SortKey[]).includes(value as SortKey)
    ? (value as SortKey)
    : 'relevance'
})
const page = computed(() => {
  const value = Number.parseInt(queryString('page'), 10)
  return Number.isFinite(value) && value > 0 ? value : 1
})

const activeFilterCount = computed(
  () => [category.value, tag.value, gameVersion.value].filter(Boolean).length,
)

const sortLabel = computed(() => SORT_OPTIONS.find((option) => option.key === sort.value)?.label ?? '综合')

const categoryLabel = computed(
  () => CATEGORIES.find((option) => option.key === category.value)?.label ?? category.value,
)

/** Counts from the server facets, falling back to the static catalogue. */
const categoryOptions = computed(() =>
  CATEGORIES.map((option) => {
    const hit = facets.value.categories.find((item) => item.key === option.key)
    return { ...option, count: hit?.count ?? 0 }
  }),
)

const tagOptions = computed(() => {
  const known = new Set(TAGS.map((option) => option.key))
  const extra = facets.value.tags.filter((item) => !known.has(item.key))
  return [...TAGS, ...extra.map((item) => ({ key: item.key, label: TAG_LABELS[item.key] ?? item.key }))]
})

const { versions: managedVersions, load: loadVersions } = useGameVersions()

/** 筛选面板：优先用服务端维护的完整列表（含暂时没有资源的版本），其次 facets，最后离线值。 */
const versionOptions = computed(() =>
  managedVersions.value.length
    ? managedVersions.value
    : facets.value.gameVersions.length
      ? facets.value.gameVersions
      : GAME_VERSIONS,
)

/* ---------- Fetching ---------- */

let controller: AbortController | null = null

async function load(): Promise<void> {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  try {
    const result = await pluginsApi.search(
      {
        // 只在自己的板里搜：插件板不会出现模组，反之亦然。
        kind: boardKind.value,
        q: q.value || undefined,
        category: category.value || undefined,
        tag: tag.value || undefined,
        gameVersion: gameVersion.value || undefined,
        sort: sort.value,
        page: page.value,
        pageSize: PAGE_SIZE,
      },
      controller.signal,
    )
    plugins.value = result.items
    facets.value = result.facets
    total.value = result.total
    totalPages.value = Math.max(1, result.totalPages)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    plugins.value = []
    total.value = 0
    if (error instanceof ApiError) snackbar.error(error.message)
  } finally {
    loading.value = false
  }
}

/** Merge patch into the query; resets pagination unless a page is given. */
function apply(patch: Record<string, string | number | undefined>, keepPage = false): void {
  const next: Record<string, string> = {}
  const base: Record<string, string | number | undefined> = {
    q: q.value || undefined,
    category: category.value || undefined,
    tag: tag.value || undefined,
    gameVersion: gameVersion.value || undefined,
    sort: sort.value === 'relevance' ? undefined : sort.value,
    page: keepPage ? page.value : undefined,
    ...patch,
  }
  for (const [key, value] of Object.entries(base)) {
    if (value === undefined || value === '') continue
    if (key === 'page' && Number(value) === 1) continue
    next[key] = String(value)
  }
  void router.push({ name: boardRoute(boardKind.value).name, query: next })
}

function setCategory(value: string): void {
  apply({ category: category.value === value ? undefined : value })
}

function setTag(value: string): void {
  apply({ tag: tag.value === value ? undefined : value })
}

function setVersion(value: string): void {
  apply({ gameVersion: gameVersion.value === value ? undefined : value })
}

function setSort(value: string): void {
  apply({ sort: value === 'relevance' ? undefined : value })
}

function submitSearch(): void {
  apply({ q: term.value.trim() || undefined })
}

function clearAll(): void {
  term.value = ''
  void router.push({ name: boardRoute(boardKind.value).name })
}

watch(
  () => route.fullPath,
  () => {
    term.value = q.value
    void load()
  },
)

onMounted(() => {
  term.value = q.value
  void loadVersions()
  void load()
})
</script>

<template>
  <div class="sc-browse">
    <section class="sc-browse__head">
      <div class="sc-shell">
        <h1 class="md-typescale-headline-medium">浏览{{ currentBoard.label }}</h1>

        <!-- 插件 / 模组：同一张浏览页里的两块板，切换时保留搜索词与筛选 -->
        <nav class="sc-browse__boards" aria-label="资源类型">
          <div class="sc-browse__boards-tabs">
            <button
              v-for="board in boardOptions"
              :key="board.key"
              type="button"
              class="sc-browse__board"
              :class="{ 'is-active': board.key === boardKind }"
              @click="switchBoard(board.key)"
            >
              <M3Icon :icon="board.icon" :size="18" />
              <span>{{ board.label }}</span>
              <span class="sc-browse__board-count">{{ board.count }}</span>
            </button>
          </div>
          <p class="md-typescale-body-medium sc-muted sc-browse__board-note">{{ currentBoard.description }}</p>
        </nav>

        <p class="md-typescale-body-large sc-muted">
          共 {{ total }} 个结果<template v-if="category"> · {{ categoryLabel }}</template
          ><template v-if="tag"> · {{ TAG_LABELS[tag] ?? tag }}</template>
        </p>

        <form class="sc-browse__search" role="search" @submit.prevent="submitSearch">
          <M3Icon :icon="IconSearch" :size="20" />
          <input
            v-model="term"
            class="sc-browse__input md-typescale-body-large"
            type="search"
            :placeholder="`搜索${currentBoard.label}…`"
            :aria-label="`搜索${currentBoard.label}`"
          />
          <M3Button v-if="term" variant="text" size="sm" @click="clearAll">清除</M3Button>
          <M3Button variant="filled" size="sm" type="submit">搜索</M3Button>
        </form>

        <div class="sc-browse__toolbar">
          <M3Menu placement="bottom-start" :min-width="200">
            <template #trigger="{ open }">
              <M3Button variant="outlined" size="sm" :icon="IconSort" :aria-expanded="open">
                {{ sortLabel }}
              </M3Button>
            </template>
            <M3MenuItem
              v-for="option in SORT_OPTIONS"
              :key="option.key"
              :label="option.label"
              :icon="option.icon"
              :selected="option.key === sort"
              @click="setSort(option.key)"
            />
          </M3Menu>

          <M3Button
            class="sc-browse__filter-btn"
            variant="outlined"
            size="sm"
            :icon="IconFilterList"
            @click="filtersOpen = true"
          >
            筛选<template v-if="activeFilterCount"> · {{ activeFilterCount }}</template>
          </M3Button>

          <M3Tooltip text="重新加载">
            <M3IconButton :icon="IconRefresh" label="重新加载" variant="standard" @click="load" />
          </M3Tooltip>

          <div class="sc-browse__active sc-hide-compact">
            <button
              v-if="category"
              type="button"
              class="sc-chip"
              @click="setCategory(category)"
            >
              {{ categoryLabel }}
              <M3Icon :icon="IconClose" :size="14" />
            </button>
            <button v-if="tag" type="button" class="sc-chip" @click="setTag(tag)">
              {{ TAG_LABELS[tag] ?? tag }}
              <M3Icon :icon="IconClose" :size="14" />
            </button>
            <button v-if="gameVersion" type="button" class="sc-chip" @click="setVersion(gameVersion)">
              {{ gameVersion }}
              <M3Icon :icon="IconClose" :size="14" />
            </button>
          </div>
        </div>

        <M3SegmentedButton
          class="sc-browse__versions sc-hide-compact"
          :options="[{ value: '', label: '全部版本' }, ...versionOptions.slice(0, 6).map((v) => ({ value: v, label: v }))]"
          :model-value="gameVersion"
          aria-label="按游戏版本筛选"
          @update:model-value="setVersion"
        />
      </div>
    </section>

    <section class="sc-shell sc-browse__grid">
      <LoadingSkeleton v-if="loading" :rows="4" />
      <PluginGrid v-else-if="plugins.length" :plugins="plugins" />
      <EmptyState
        v-else
        :title="q ? `没有找到与“${q}”匹配的插件` : '没有符合条件的插件'"
        description="试试更换关键词，或清除筛选条件。"
        action-label="清除全部筛选"
        @action="clearAll"
      />

      <ScPagination
        v-if="!loading && plugins.length"
        :page="page"
        :total-pages="totalPages"
        @update:page="(value) => apply({ page: value }, true)"
      />
    </section>

    <M3Sheet v-model="filtersOpen" side="end" size="min(400px, 92vw)" title="筛选插件">
      <div class="sc-filters">
        <section class="sc-filters__group">
          <p class="sc-filters__title md-typescale-title-small">
            <M3Icon :icon="IconTune" :size="18" />
            分类
          </p>
          <div class="sc-filters__options">
            <button
              v-for="option in categoryOptions"
              :key="option.key"
              type="button"
              class="sc-filter-chip"
              :class="{ 'is-active': option.key === category }"
              :aria-pressed="option.key === category"
              @click="setCategory(option.key)"
            >
              <span>{{ option.label }}</span>
              <span v-if="option.count" class="sc-filter-chip__count">{{ option.count }}</span>
            </button>
          </div>
        </section>

        <section class="sc-filters__group">
          <p class="sc-filters__title md-typescale-title-small">标签</p>
          <div class="sc-filters__options">
            <button
              v-for="option in tagOptions"
              :key="option.key"
              type="button"
              class="sc-filter-chip"
              :class="{ 'is-active': option.key === tag }"
              :aria-pressed="option.key === tag"
              @click="setTag(option.key)"
            >
              {{ option.label }}
            </button>
          </div>
        </section>

        <section class="sc-filters__group">
          <p class="sc-filters__title md-typescale-title-small">游戏版本</p>
          <div class="sc-filters__options">
            <button
              v-for="version in versionOptions"
              :key="version"
              type="button"
              class="sc-filter-chip"
              :class="{ 'is-active': version === gameVersion }"
              :aria-pressed="version === gameVersion"
              @click="setVersion(version)"
            >
              {{ version }}
            </button>
          </div>
        </section>
      </div>

      <template #footer>
        <M3Button variant="text" @click="clearAll">重置</M3Button>
        <M3Button variant="filled" @click="filtersOpen = false">完成</M3Button>
      </template>
    </M3Sheet>
  </div>
</template>

<style scoped>
.sc-browse__boards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-block: 14px 18px;
}

.sc-browse__boards-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sc-browse__board {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding-inline: 18px;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  cursor: pointer;
}

.sc-browse__board.is-active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.sc-browse__board-count {
  padding: 1px 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: color-mix(in srgb, currentColor 12%, transparent);
  font-size: var(--md-sys-typescale-label-medium-size);
}

.sc-browse__board-note {
  max-width: 80ch;
}
.sc-browse__head {
  padding-block: 32px 20px;
  background: linear-gradient(180deg, var(--md-sys-color-surface-container-low), transparent);
  border-block-end: 1px solid var(--md-sys-color-outline-variant);
}

.sc-browse__head h1 {
  font-family: var(--md-ref-typeface-brand);
}

.sc-browse__search {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 640px;
  height: 52px;
  margin-block-start: 16px;
  padding-inline: 16px 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-browse__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.sc-browse__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-block-start: 16px;
}

.sc-browse__active {
  display: flex;
  gap: 6px;
  margin-inline-start: 4px;
}

.sc-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding-inline: 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-size: var(--md-sys-typescale-label-large-size);
  cursor: pointer;
}

.sc-browse__versions {
  margin-block-start: 16px;
}

.sc-browse__grid {
  padding-block: 28px 56px;
  min-height: 50vh;
}

/* ---------- Filter sheet ---------- */
.sc-filters {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}

.sc-filters__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-block-end: 10px;
  font-weight: var(--md-typescale-title-small-weight);
}

.sc-filters__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding-inline: 14px;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
  font-size: var(--md-sys-typescale-label-large-size);
  cursor: pointer;
  transition:
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.sc-filter-chip.is-active {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  box-shadow: none;
}

.sc-filter-chip__count {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
}

.sc-filters__options + .sc-filters__title {
  margin-block-start: 4px;
}
</style>
