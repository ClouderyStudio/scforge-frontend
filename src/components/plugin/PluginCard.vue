<script setup lang="ts">
import { computed } from 'vue'
import { IconDownload, IconRefresh, IconTag, IconThumbUp, IconVerified } from '@/icons'
import { M3Icon } from '@/components/m3'
import PluginIcon from './PluginIcon.vue'
import type { PluginSummary } from '@/api/types'
import { CATEGORY_LABELS, TAG_LABELS, detailRoute } from '@/data/catalog'
import { formatCount, formatRelative } from '@/utils/format'

const props = defineProps<{ plugin: PluginSummary; featured?: boolean }>()

const categoryLabel = computed(() => CATEGORY_LABELS[props.plugin.category] ?? props.plugin.category)
const tags = computed(() => props.plugin.tags.slice(0, 3).map((tag) => TAG_LABELS[tag] ?? tag))
const score = computed(() => props.plugin.upvotes - props.plugin.downvotes)
</script>

<template>
  <RouterLink
    class="sc-card"
    :class="{ 'sc-card--featured': featured }"
    :to="detailRoute(plugin.kind, plugin.slug)"
    :aria-label="`${plugin.name}：${plugin.summary}`"
  >
    <div class="sc-card__top">
      <PluginIcon :src="plugin.iconUrl" :name="plugin.name" :size="56" />
      <div class="sc-card__heading">
        <p class="sc-card__name md-typescale-title-medium">
          {{ plugin.name }}
          <span v-if="plugin.kind === 'mod'" class="md-tag sc-card__kind">模组</span>
          <M3Icon v-if="plugin.featured" :icon="IconVerified" :size="16" class="sc-card__verified" />
        </p>
        <p class="sc-card__author md-typescale-body-small sc-muted">
          <span>{{ plugin.author.username }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ formatRelative(plugin.updatedAt) }}更新</span>
        </p>
      </div>
    </div>

    <p class="sc-card__summary md-typescale-body-medium sc-clamp-2">{{ plugin.summary }}</p>

    <div class="sc-card__tags">
      <span class="md-tag">{{ categoryLabel }}</span>
      <span v-for="tag in tags" :key="tag" class="md-tag md-tag--outlined">
        <M3Icon :icon="IconTag" :size="12" />
        {{ tag }}
      </span>
    </div>

    <div class="sc-card__footer">
      <span class="sc-card__stat" :title="`下载 ${formatCount(plugin.downloads)}`">
        <M3Icon :icon="IconDownload" :size="16" />
        <span class="md-typescale-label-medium">{{ formatCount(plugin.downloads) }}</span>
      </span>
      <span class="sc-card__stat" :class="{ 'is-positive': score > 0 }" :title="`评分 ${score}`">
        <M3Icon :icon="IconThumbUp" :size="16" />
        <span class="md-typescale-label-medium">{{ formatCount(score) }}</span>
      </span>
      <span class="sc-card__stat" :title="`最近版本 ${plugin.latestVersion ?? '—'}`">
        <M3Icon :icon="IconRefresh" :size="16" />
        <span class="md-typescale-label-medium">{{ plugin.latestVersion ?? '—' }}</span>
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.sc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  text-decoration: none;
  transition:
    transform var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized),
    box-shadow var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard),
    background-color var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
}

@media (hover: hover) {
  .sc-card:hover {
    transform: translateY(-4px);
    background-color: var(--md-sys-color-surface-container);
    box-shadow:
      inset 0 0 0 1px var(--md-sys-color-outline-variant),
      var(--md-sys-elevation-level2);
  }
}

.sc-card--featured {
  background-color: color-mix(in srgb, var(--md-sys-color-primary-container) 42%, var(--md-sys-color-surface-container-low));
}

.sc-card__top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sc-card__heading {
  min-width: 0;
}

.sc-card__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: var(--md-typescale-title-medium-weight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-card__verified {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.sc-card__author {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-card__summary {
  flex: 1;
  color: var(--md-sys-color-on-surface-variant);
  min-height: 40px;
}

.sc-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-card__footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-card__stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sc-card__stat.is-positive {
  color: var(--md-sys-color-tertiary);
}
</style>
