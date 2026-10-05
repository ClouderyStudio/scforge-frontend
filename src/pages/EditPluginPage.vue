<script setup lang="ts">
/**
 * 作者编辑自己的插件：资料 + 版本管理。
 *
 * 服务端规则：**任何编辑都会让内容回到待审核**，审核通过前不再对公众可见 ——
 * 因此页面上到处都在提醒这件事，提交前也再确认一次。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconAdd,
  IconArrowBack,
  IconCheckCircle,
  IconDelete,
  IconEdit,
  IconHistory,
  IconLock,
  IconSave,
  IconUploadFile,
} from '@/icons'
import { M3Button, M3Dialog, M3Icon, M3IconButton, M3SegmentedButton, M3Tooltip } from '@/components/m3'
import FileDrop from '@/components/ui/FileDrop.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ScMarkdownEditor from '@/components/markdown/ScMarkdownEditor.vue'
import VersionList from '@/components/plugin/VersionList.vue'
import { pluginsApi } from '@/api/plugins'
import { useGameVersions } from '@/composables/useGameVersions'
import type { PluginDetail, PluginVersion, ReleaseChannel } from '@/api/types'
import {
  acceptForKind,
  CATEGORIES,
  detailRoute,
  MAX_GALLERY,
  MAX_IMAGE_BYTES,
  MAX_TAGS,
  RELEASE_CHANNELS,
  TAGS,
} from '@/data/catalog'
import { CONTENT_STATUS_LABELS } from '@/data/review'
import { useSnackbar } from '@/composables/useSnackbar'

const route = useRoute()
const router = useRouter()
const snackbar = useSnackbar()

const plugin = ref<PluginDetail | null>(null)
const { versions: versionOptions, load: loadVersions } = useGameVersions()
const loading = ref(true)
const saving = ref(false)
const denied = ref(false)
const tab = ref('meta')

const form = ref({
  summary: '',
  description: '',
  readme: '',
  category: 'misc',
  gameVersion: '2.4',
  sourceUrl: '',
  issuesUrl: '',
  license: '',
  licenseUrl: '',
  donationUrl: '',
  discordUrl: '',
})
const tags = ref<string[]>([])
const icon = ref<File | null>(null)
const gallery = ref<File[]>([])
const clearIcon = ref(false)
const clearGallery = ref(false)

/* ---------------- 版本编辑状态 ---------------- */
const editingVersion = ref<string | null>(null)
const versionForm = ref({
  channel: 'release' as ReleaseChannel,
  changelog: '',
  gameVersions: [] as string[],
  dependencies: '',
})
const versionBusy = ref(false)
const replacingFileFor = ref<string | null>(null)
const replaceTarget = ref<PluginVersion | null>(null)
const replaceInput = ref<HTMLInputElement | null>(null)
const confirmDelete = ref<PluginVersion | null>(null)

/** 删除确认框的开关（对话框需要一个可读写的布尔值）。 */
const confirmValue = computed({
  get: () => confirmDelete.value !== null,
  set: (value: boolean) => {
    if (!value) confirmDelete.value = null
  },
})

const tabs = [
  { value: 'meta', label: '插件资料' },
  { value: 'versions', label: '版本管理' },
]

const slug = computed(() => String(route.params.slug ?? ''))
const resourceKind = computed(() => plugin.value?.kind ?? (route.meta.kind as string | undefined) ?? 'plugin')
const detailTarget = computed(() => detailRoute(resourceKind.value, slug.value))
const canSeeHidden = computed(() => plugin.value?.canManage || plugin.value?.canManageContent)

function syncForm(item: PluginDetail): void {
  form.value = {
    summary: item.summary,
    description: item.description,
    readme: item.readme,
    category: item.category,
    gameVersion: item.gameVersion,
    sourceUrl: item.sourceUrl ?? '',
    issuesUrl: item.issuesUrl ?? '',
    license: item.license ?? '',
    licenseUrl: item.licenseUrl ?? '',
    donationUrl: item.donationUrl ?? '',
    discordUrl: item.discordUrl ?? '',
  }
  tags.value = [...item.tags]
}

async function load(): Promise<void> {
  loading.value = true
  denied.value = false
  try {
    const result = await pluginsApi.detail(slug.value)
    plugin.value = result.addon
    if (!result.addon.canManage && !result.addon.canManageContent) {
      denied.value = true
      return
    }
    syncForm(result.addon)
  } catch (error) {
    denied.value = true
    snackbar.error(error instanceof Error ? error.message : '加载插件失败')
  } finally {
    loading.value = false
  }
}

function toggleTag(key: string): void {
  const next = [...tags.value]
  const index = next.indexOf(key)
  if (index >= 0) next.splice(index, 1)
  else if (next.length < MAX_TAGS) next.push(key)
  else snackbar.show(`最多选择 ${MAX_TAGS} 个标签`)
  tags.value = next
}

function toggleVersionGame(value: string): void {
  const next = [...versionForm.value.gameVersions]
  const index = next.indexOf(value)
  if (index >= 0) next.splice(index, 1)
  else next.push(value)
  versionForm.value.gameVersions = next
}

function onGalleryInput(event: Event): void {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  if (files.length) gallery.value = [...gallery.value, ...files].slice(0, MAX_GALLERY)
  ;(event.target as HTMLInputElement).value = ''
}

/* ---------------- 保存资料（multipart PUT） ---------------- */

async function save(): Promise<void> {
  const item = plugin.value
  if (!item) return

  const data = new FormData()
  data.append('summary', form.value.summary)
  data.append('description', form.value.description)
  data.append('readme', form.value.readme)
  data.append('category', form.value.category)
  data.append('gameVersion', form.value.gameVersion)
  for (const tag of tags.value) data.append('tags', tag)
  // 空字符串表示「清空该链接」（服务端会 trim 成 null）。
  data.append('sourceUrl', form.value.sourceUrl)
  data.append('issuesUrl', form.value.issuesUrl)
  data.append('license', form.value.license)
  data.append('licenseUrl', form.value.licenseUrl)
  data.append('donationUrl', form.value.donationUrl)
  data.append('discordUrl', form.value.discordUrl)
  if (icon.value) data.append('icon', icon.value)
  if (clearIcon.value) data.append('clearIcon', 'true')
  for (const file of gallery.value) data.append('gallery', file)
  if (clearGallery.value) data.append('clearGallery', 'true')

  saving.value = true
  try {
    const result = await pluginsApi.update(item.id, data)
    plugin.value = result.addon
    syncForm(result.addon)
    icon.value = null
    gallery.value = []
    clearIcon.value = false
    clearGallery.value = false
    snackbar.success('已保存，插件重新进入待审核')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

/* ---------------- 版本操作 ---------------- */

function startVersionEdit(version: PluginVersion): void {
  editingVersion.value = version.id
  versionForm.value = {
    channel: version.channel,
    changelog: version.changelog,
    gameVersions: [...version.gameVersions],
    dependencies: version.dependencies.join(', '),
  }
}

async function saveVersion(version: PluginVersion): Promise<void> {
  versionBusy.value = true
  try {
    const result = await pluginsApi.updateVersion(version.id, {
      channel: versionForm.value.channel,
      changelog: versionForm.value.changelog,
      gameVersions: versionForm.value.gameVersions,
      dependencies: versionForm.value.dependencies
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    })
    snackbar.success('版本已更新，重新进入待审核')
    editingVersion.value = null
    await reloadVersions(result.version.id)
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    versionBusy.value = false
  }
}

function pickReplacementFile(version: PluginVersion): void {
  replaceTarget.value = version
  replacingFileFor.value = version.id
  replaceInput.value?.click()
}

async function onReplaceFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const version = replaceTarget.value
  input.value = ''
  if (!file || !version) return

  const data = new FormData()
  data.append('package', file)
  versionBusy.value = true
  try {
    await pluginsApi.replaceVersionFile(version.id, data)
    snackbar.success('文件已替换，该版本重新进入待审核')
    await reloadVersions()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '替换失败')
  } finally {
    versionBusy.value = false
    replacingFileFor.value = null
    replaceTarget.value = null
  }
}

async function removeVersion(): Promise<void> {
  const version = confirmDelete.value
  if (!version) return
  versionBusy.value = true
  try {
    await pluginsApi.deleteVersion(version.id)
    snackbar.success('版本已删除')
    confirmDelete.value = null
    await reloadVersions()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    versionBusy.value = false
  }
}

async function resubmitVersion(version: PluginVersion): Promise<void> {
  versionBusy.value = true
  try {
    await pluginsApi.resubmitVersion(version.id)
    snackbar.success('已重新提交，等待审核')
    await reloadVersions()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '提交失败')
  } finally {
    versionBusy.value = false
  }
}

async function reloadVersions(focusId?: string): Promise<void> {
  const result = await pluginsApi.detail(slug.value)
  plugin.value = result.addon
  void focusId
}

onMounted(() => {
  void loadVersions()
  void load()
})
</script>

<template>
  <div class="sc-edit sc-shell">
    <LoadingSkeleton v-if="loading" :rows="3" />

    <EmptyState
      v-else-if="denied || !plugin || !canSeeHidden"
      title="不能编辑这个插件"
      description="只有作者本人（或有内容管理权限的管理员）可以编辑。"
      action-label="返回插件页"
      @action="router.push(detailTarget)"
    />

    <template v-else>
      <header class="sc-edit__head">
        <M3Button variant="text" :icon="IconArrowBack" @click="router.push(detailTarget)">
          返回插件页
        </M3Button>
        <h1 class="md-typescale-headline-medium">编辑「{{ plugin.name }}」</h1>
        <p class="md-typescale-body-large sc-muted">
          当前状态：<b>{{ CONTENT_STATUS_LABELS[plugin.status] }}</b
          >。保存任何改动都会让插件<b>重新进入待审核</b>，审核通过前不对公众可见。
        </p>
        <p v-if="plugin.reviewNote" class="sc-edit__note md-typescale-body-medium">
          <M3Icon :icon="IconHistory" :size="16" />
          审核意见：{{ plugin.reviewNote }}
        </p>
      </header>

      <M3SegmentedButton
        class="sc-edit__tabs"
        :options="tabs"
        :model-value="tab"
        aria-label="编辑分区"
        @update:model-value="(value) => (tab = value)"
      />

      <!-- ---------------- 插件资料 ---------------- -->
      <form v-if="tab === 'meta'" class="sc-edit__form" @submit.prevent="save">
        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconEdit" :size="20" />
            基本信息
          </h2>

          <label class="sc-field">
            <span class="sc-field__label md-typescale-label-large">一句话简介 *</span>
            <input v-model="form.summary" class="sc-input md-typescale-body-medium" maxlength="280" />
          </label>

          <div class="sc-field">
            <ScMarkdownEditor v-model="form.description" label="详细描述 *" :rows="6" />
          </div>

          <div class="sc-field">
            <ScMarkdownEditor v-model="form.readme" label="README" :rows="8" />
          </div>

          <div class="sc-field-row">
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">分类 *</span>
              <select v-model="form.category" class="sc-input md-typescale-body-medium">
                <option v-for="option in CATEGORIES" :key="option.key" :value="option.key">{{ option.label }}</option>
              </select>
            </label>
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">主要游戏版本 *</span>
              <select v-model="form.gameVersion" class="sc-input md-typescale-body-medium">
                <option v-for="version in versionOptions" :key="version" :value="version">{{ version }}</option>
              </select>
            </label>
          </div>

          <div class="sc-field">
            <span class="sc-field__label md-typescale-label-large">标签（最多 {{ MAX_TAGS }} 个）</span>
            <div class="sc-chips">
              <button
                v-for="tag in TAGS"
                :key="tag.key"
                type="button"
                class="sc-tag-toggle"
                :class="{ 'is-on': tags.includes(tag.key) }"
                @click="toggleTag(tag.key)"
              >
                {{ tag.label }}
              </button>
            </div>
          </div>
        </section>

        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconUploadFile" :size="20" />
            图标与截图
          </h2>
          <p class="md-typescale-body-small sc-muted">
            上传新文件即替换现有内容；留空表示保持不变。名称与访问标识不可修改。
          </p>

          <FileDrop
            v-model="icon"
            accept="image/png,image/jpeg,image/webp,image/gif"
            label="替换插件图标"
            hint="JPG / PNG / WebP / GIF；服务端会统一转为 WebP"
            :max-bytes="MAX_IMAGE_BYTES"
            preview
          />
          <label v-if="plugin.iconUrl" class="sc-checkline md-typescale-body-medium">
            <input v-model="clearIcon" type="checkbox" />
            删除现有图标（改用渐变首字母兜底）
          </label>

          <div class="sc-field">
            <span class="sc-field__label md-typescale-label-large">替换截图（最多 {{ MAX_GALLERY }} 张）</span>
            <input
              class="sc-input md-typescale-body-medium"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              @change="onGalleryInput"
            />
            <p v-if="gallery.length" class="md-typescale-body-small sc-muted">
              将替换为：{{ gallery.map((file) => file.name).join('、') }}
            </p>
          </div>
          <label v-if="plugin.gallery.length" class="sc-checkline md-typescale-body-medium">
            <input v-model="clearGallery" type="checkbox" />
            删除现有截图（共 {{ plugin.gallery.length }} 张）
          </label>
        </section>

        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconSave" :size="20" />
            外部链接
          </h2>
          <div class="sc-field-row">
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">源码地址</span>
              <input v-model="form.sourceUrl" class="sc-input md-typescale-body-medium" placeholder="https://…" />
            </label>
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">问题反馈</span>
              <input v-model="form.issuesUrl" class="sc-input md-typescale-body-medium" placeholder="https://…" />
            </label>
          </div>
          <div class="sc-field-row">
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">许可证</span>
              <input v-model="form.license" class="sc-input md-typescale-body-medium" placeholder="例如 MIT" />
            </label>
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">许可证链接</span>
              <input v-model="form.licenseUrl" class="sc-input md-typescale-body-medium" placeholder="https://…" />
            </label>
          </div>
          <div class="sc-field-row">
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">赞助链接</span>
              <input v-model="form.donationUrl" class="sc-input md-typescale-body-medium" placeholder="https://…" />
            </label>
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">Discord / 群组</span>
              <input v-model="form.discordUrl" class="sc-input md-typescale-body-medium" placeholder="https://…" />
            </label>
          </div>
        </section>

        <div class="sc-edit__actions">
          <M3Button variant="text" @click="router.push(detailTarget)">取消</M3Button>
          <M3Button variant="filled" type="submit" :icon="IconSave" :disabled="saving">
            {{ saving ? '保存中…' : '保存并重新提交审核' }}
          </M3Button>
        </div>
      </form>

      <!-- ---------------- 版本管理 ---------------- -->
      <div v-else class="sc-edit__versions">
        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconAdd" :size="20" />
            发布新版本
          </h2>
          <p class="md-typescale-body-small sc-muted">
            新版本会在审核通过后出现在公开的版本列表中；已通过审核的旧版本不受影响。
          </p>
          <div>
            <M3Button
              variant="tonal"
              :icon="IconAdd"
              @click="router.push({ name: 'upload', query: { plugin: plugin.id } })"
            >
              填写新版本
            </M3Button>
          </div>
        </section>

        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconLock" :size="20" />
            版本列表（{{ plugin.versionCount }}）
          </h2>

          <ul class="sc-version-admin">
            <li v-for="version in plugin.versions" :key="version.id" class="sc-version-admin__row">
              <div class="sc-version-admin__main">
                <p class="md-typescale-title-small">
                  {{ version.version }}
                  <span class="md-tag" :class="`sc-status sc-status--${version.status}`">
                    {{ CONTENT_STATUS_LABELS[version.status] }}
                  </span>
                  <span class="md-tag md-tag--outlined">{{ version.channel }}</span>
                </p>
                <p class="md-typescale-body-small sc-muted">
                  {{ version.fileName }} · 兼容 {{ version.gameVersions.join(', ') || version.gameVersion }}
                </p>
                <p v-if="version.reviewNote" class="sc-version-admin__note md-typescale-body-small">
                  驳回理由：{{ version.reviewNote }}
                </p>
              </div>

              <div class="sc-version-admin__actions">
                <M3Tooltip text="编辑版本信息">
                  <M3IconButton
                    :icon="IconEdit"
                    label="编辑版本信息"
                    size="sm"
                    variant="standard"
                    @click="startVersionEdit(version)"
                  />
                </M3Tooltip>
                <M3Tooltip text="替换插件包文件">
                  <M3IconButton
                    :icon="IconUploadFile"
                    label="替换插件包文件"
                    size="sm"
                    variant="standard"
                    :disabled="versionBusy || replacingFileFor === version.id"
                    @click="pickReplacementFile(version)"
                  />
                </M3Tooltip>
                <M3Button
                  v-if="version.status === 'rejected'"
                  variant="text"
                  size="sm"
                  :disabled="versionBusy"
                  @click="resubmitVersion(version)"
                >
                  重新提交
                </M3Button>
                <M3Tooltip text="删除版本">
                  <M3IconButton
                    :icon="IconDelete"
                    label="删除版本"
                    size="sm"
                    variant="standard"
                    :disabled="versionBusy || plugin.versionCount <= 1"
                    @click="confirmDelete = version"
                  />
                </M3Tooltip>
              </div>

              <div v-if="editingVersion === version.id" class="sc-version-admin__editor">
                <div class="sc-field-row">
                  <label class="sc-field">
                    <span class="sc-field__label md-typescale-label-large">发布渠道</span>
                    <select v-model="versionForm.channel" class="sc-input md-typescale-body-medium">
                      <option v-for="channel in RELEASE_CHANNELS" :key="channel.key" :value="channel.key">
                        {{ channel.label }}
                      </option>
                    </select>
                  </label>
                  <label class="sc-field">
                    <span class="sc-field__label md-typescale-label-large">依赖（逗号分隔）</span>
                    <input v-model="versionForm.dependencies" class="sc-input md-typescale-body-medium" />
                  </label>
                </div>

                <div class="sc-field">
                  <span class="sc-field__label md-typescale-label-large">兼容游戏版本</span>
                  <div class="sc-chips">
                    <button
                      v-for="game in versionOptions"
                      :key="game"
                      type="button"
                      class="sc-tag-toggle"
                      :class="{ 'is-on': versionForm.gameVersions.includes(game) }"
                      @click="toggleVersionGame(game)"
                    >
                      {{ game }}
                    </button>
                  </div>
                </div>

                <ScMarkdownEditor v-model="versionForm.changelog" label="更新日志" :rows="5" />

                <div class="sc-version-admin__editor-actions">
                  <M3Button variant="text" size="sm" @click="editingVersion = null">取消</M3Button>
                  <M3Button variant="filled" size="sm" :disabled="versionBusy" @click="saveVersion(version)">
                    保存版本
                  </M3Button>
                </div>
              </div>
            </li>
          </ul>

          <EmptyState v-if="!plugin.versions.length" title="还没有版本" description="先发布一个版本吧。" />
        </section>

        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconCheckCircle" :size="20" />
            公开效果预览
          </h2>
          <p class="md-typescale-body-small sc-muted">下面是从公众视角看到的版本列表（只含已通过审核的版本）。</p>
          <VersionList :versions="plugin.versions.filter((item) => item.status === 'published')" />
        </section>
      </div>

      <!-- 隐藏的文件选择器：替换版本文件 -->
      <input
        ref="replaceInput"
        class="sr-only"
        type="file"
        :accept="acceptForKind(resourceKind)"
        @change="onReplaceFile"
      />

      <M3Dialog v-model="confirmValue" title="删除这个版本？">
        删除后无法恢复；如果它是最后一个版本，请改为删除整个插件。
        <template #actions>
          <M3Button variant="text" @click="confirmDelete = null">取消</M3Button>
          <M3Button variant="filled" :disabled="versionBusy" @click="removeVersion">删除</M3Button>
        </template>
      </M3Dialog>
    </template>
  </div>
</template>

<style scoped>
.sc-edit {
  padding-block: 32px 72px;
}

.sc-edit__head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-block-end: 16px;
}

.sc-edit__head h1 {
  font-family: var(--md-ref-typeface-brand);
}

.sc-edit__note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.sc-edit__tabs {
  margin-block-end: 16px;
}

.sc-edit__form,
.sc-edit__versions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-form-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-form-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--md-typescale-title-medium-weight);
}

.sc-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sc-field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 16px;
}

.sc-field__label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-input {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  font: inherit;
  outline: none;
}

.sc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-tag-toggle {
  height: 32px;
  padding-inline: 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
  font-size: var(--md-sys-typescale-label-large-size);
  cursor: pointer;
}

.sc-tag-toggle.is-on {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  box-shadow: none;
}

.sc-checkline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-edit__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.sc-version-admin {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sc-version-admin__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 16px;
  padding: 14px;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container);
}

.sc-version-admin__main {
  min-width: 0;
}

.sc-version-admin__main p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sc-version-admin__note {
  margin-block-start: 6px;
  color: var(--md-sys-color-error);
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

.sc-version-admin__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sc-version-admin__editor {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--md-sys-color-outline-variant);
}

.sc-version-admin__editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
</style>
