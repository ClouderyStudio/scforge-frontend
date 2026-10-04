<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconDownload, IconExpandLess, IconExpandMore, IconFolderZip, IconPublic, IconSchedule, IconVerified } from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import ScMarkdown from '@/components/markdown/ScMarkdown.vue'
import type { PluginVersion } from '@/api/types'
import { CHANNEL_LABELS, isModPackage } from '@/data/catalog'
import { CONTENT_STATUS_LABELS, contentStatusTone } from '@/data/review'
import { formatBytes, formatCount, formatDateTime } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    versions: PluginVersion[]
    /** 版本 id 正在下载。 */
    downloading?: string | null
    /** 作者 / 管理员视图：显示审核状态与驳回理由。 */
    showStatus?: boolean
  }>(),
  { downloading: null, showStatus: false },
)

const emit = defineEmits<{ (e: 'download', version: PluginVersion): void }>()

const expanded = ref<Set<string>>(new Set())

function toggle(id: string): void {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

const latestPublishedId = computed(
  () => props.versions.find((version) => version.status === 'published')?.id ?? null,
)
</script>

<template>
  <ol class="sc-versions">
    <li v-for="(version, index) in versions" :key="version.id" class="sc-version">
      <div class="sc-version__head">
        <div class="sc-version__identity">
          <p class="md-typescale-title-medium">
            <M3Icon :icon="IconVerified" :size="16" class="sc-version__icon" />
            {{ version.version }}
            <span class="md-tag" :class="`md-tag--${version.channel}`">
              {{ CHANNEL_LABELS[version.channel] ?? version.channel }}
            </span>
            <span v-if="version.id === latestPublishedId" class="md-tag sc-version__latest">最新</span>
            <span
              v-if="showStatus"
              class="md-tag"
              :class="`sc-version__status sc-version__status--${contentStatusTone(version.status)}`"
            >
              {{ CONTENT_STATUS_LABELS[version.status] }}
            </span>
          </p>
          <p class="md-typescale-body-small sc-muted">
            <M3Icon :icon="IconSchedule" :size="14" />
            {{ formatDateTime(version.publishedAt) }}
            <span aria-hidden="true">·</span>
            <M3Icon :icon="IconFolderZip" :size="14" />
            {{ version.fileName }} · {{ formatBytes(version.fileSize) }}
            <span aria-hidden="true">·</span>
            {{ formatCount(version.downloads) }} 次下载
          </p>
        </div>

        <div class="sc-version__actions">
          <M3Button
            v-if="version.changelog"
            variant="text"
            size="sm"
            :icon="expanded.has(version.id) ? IconExpandLess : IconExpandMore"
            @click="toggle(version.id)"
          >
            更新日志
          </M3Button>
          <M3Button
            :variant="index === 0 && version.status === 'published' ? 'filled' : 'tonal'"
            size="sm"
            :icon="IconDownload"
            :disabled="downloading === version.id || version.status !== 'published'"
            @click="emit('download', version)"
          >
            {{ downloading === version.id ? '下载中…' : version.status === 'published' ? '下载' : '待审核' }}
          </M3Button>
        </div>
      </div>

      <p v-if="isModPackage(version.fileName)" class="sc-version__kind md-typescale-body-small">
        <M3Icon :icon="IconPublic" :size="14" />
        这是模组（.netmod）：会随服务器下发到客户端，安装前请确认玩家侧也能接受。
      </p>

      <div class="sc-version__tags">
        <span
          class="md-tag"
          :class="isModPackage(version.fileName) ? 'sc-version__mod-tag' : 'md-tag--outlined'"
        >
          {{ isModPackage(version.fileName) ? '模组' : '插件' }}
        </span>
        <span class="md-typescale-label-medium sc-muted">兼容</span>
        <span
          v-for="game in version.gameVersions.length ? version.gameVersions : [version.gameVersion]"
          :key="game"
          class="md-tag md-tag--outlined"
        >
          {{ game }}
        </span>
        <template v-if="version.dependencies.length">
          <span class="md-typescale-label-medium sc-muted">依赖</span>
          <span v-for="dep in version.dependencies" :key="dep" class="md-tag md-tag--outlined">{{ dep }}</span>
        </template>
      </div>

      <p
        v-if="showStatus && version.status === 'rejected' && version.reviewNote"
        class="sc-version__note md-typescale-body-small"
      >
        驳回理由：{{ version.reviewNote }}
      </p>

      <div v-if="expanded.has(version.id)" class="sc-version__changelog">
        <ScMarkdown :source="version.changelog" />
      </div>
    </li>
  </ol>
</template>

<style scoped>
.sc-versions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sc-version {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-version__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.sc-version__identity p {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sc-version__identity .sc-muted {
  margin-block-start: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-version__icon {
  color: var(--md-sys-color-primary);
}

.sc-version__latest {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.sc-version__status--pending {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-version__status--published {
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.sc-version__status--rejected {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.sc-version__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-version__kind {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-version__mod-tag {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-version__tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-version__note {
  padding: 8px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.sc-version__changelog {
  padding: 12px 14px;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container);
}

.md-tag--release {
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.md-tag--beta {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.md-tag--alpha {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}
</style>
