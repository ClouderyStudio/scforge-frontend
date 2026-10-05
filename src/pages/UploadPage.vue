<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowBack,
  IconCloudUpload,
  IconInfo,
  IconInventory2,
  IconPublic,
  IconRocketLaunch,
  IconStorage,
  IconTag,
  IconTune,
} from '@/icons'
import { M3Button, M3Chip, M3Icon, M3SegmentedButton, M3Tooltip } from '@/components/m3'
import FileDrop from '@/components/ui/FileDrop.vue'
import ScMarkdownEditor from '@/components/markdown/ScMarkdownEditor.vue'
import { pluginsApi } from '@/api/plugins'
import { useGameVersions } from '@/composables/useGameVersions'
import type { PluginDetail, ResourceKind } from '@/api/types'
import {
  acceptForKind,
  CATEGORIES,
  detailRoute,
  KINDS,
  KIND_LABELS,
  kindOption,
  MAX_GALLERY,
  MAX_IMAGE_BYTES,
  MAX_PLUGIN_BYTES,
  MAX_TAGS,
  RELEASE_CHANNELS,
  TAGS,
} from '@/data/catalog'
import { useSnackbar } from '@/composables/useSnackbar'

const route = useRoute()
const router = useRouter()
const snackbar = useSnackbar()

/** When `?plugin=<id>` is present the page only publishes a new version. */
const targetPluginId = computed(() => {
  const value = route.query.plugin
  return typeof value === 'string' && value ? value : ''
})
const versionOnly = computed(() => Boolean(targetPluginId.value))

const target = ref<PluginDetail | null>(null)
/** 只有作者能为已有插件发版本；非作者（含管理员）直接拦住，不再到服务端换一个 403。 */
const notAuthor = ref(false)
const loadingTarget = ref(false)
const submitting = ref(false)
const error = ref('')
const slugTouched = ref(false)

const form = ref({
  name: '',
  slug: '',
  summary: '',
  description: '',
  readme: '',
  category: '',
  gameVersion: '',
  sourceUrl: '',
  issuesUrl: '',
  license: '',
  licenseUrl: '',
  donationUrl: '',
  discordUrl: '',
  version: '1.0.0',
  channel: 'release',
  changelog: '',
  dependencies: '',
})

const tags = ref<string[]>([])
const gameVersions = ref<string[]>([])
const icon = ref<File | null>(null)
const gallery = ref<File[]>([])
const pkg = ref<File | null>(null)

/**
 * 资源类型：插件（.dll，仅服务端）或模组（.netmod，会下发到客户端）。
 * 创建后不可更改；为已有资源追加版本时跟随它原本的类型。
 */
const kind = ref<ResourceKind>(route.query.kind === 'mod' ? 'mod' : 'plugin')

// 可选游戏版本来自服务端（超管可在后台添加），新的在前。
const { versions: versionOptions, load: loadVersions } = useGameVersions()
const currentKind = computed(() => kindOption(kind.value))

/** Slug preview: latin-safe, lowercase, dash separated. */
const derivedSlug = computed(() => {
  const base = form.value.slug.trim() || form.value.name.trim()
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
})

const canSubmit = computed(() => {
  if (notAuthor.value) return false
  if (submitting.value) return false
  if (!pkg.value) return false
  if (!form.value.version.trim()) return false
  if (versionOnly.value) return true
  return Boolean(
    form.value.name.trim() &&
      form.value.summary.trim() &&
      form.value.description.trim() &&
      form.value.category &&
      form.value.gameVersion &&
      derivedSlug.value.length >= 2,
  )
})

function toggleTag(key: string): void {
  const next = [...tags.value]
  const index = next.indexOf(key)
  if (index >= 0) next.splice(index, 1)
  else if (next.length < MAX_TAGS) next.push(key)
  else snackbar.show(`最多选择 ${MAX_TAGS} 个标签`)
  tags.value = next
}

function toggleVersion(value: string): void {
  const next = [...gameVersions.value]
  const index = next.indexOf(value)
  if (index >= 0) next.splice(index, 1)
  else next.push(value)
  gameVersions.value = next
}

function onGalleryInput(event: Event): void {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  gallery.value = [...gallery.value, ...files].slice(0, MAX_GALLERY)
  ;(event.target as HTMLInputElement).value = ''
}

function removeGallery(index: number): void {
  gallery.value = gallery.value.filter((_, i) => i !== index)
}

function buildForm(): FormData {
  const data = new FormData()
  data.append('package', pkg.value as File)
  data.append('version', form.value.version.trim())
  data.append('channel', form.value.channel)
  data.append('changelog', form.value.changelog)
  for (const version of gameVersions.value) data.append('gameVersions', version)
  for (const dep of form.value.dependencies.split(/[,，\n]/).map((d) => d.trim()).filter(Boolean)) {
    data.append('dependencies', dep)
  }

  if (versionOnly.value) return data

  data.append('kind', kind.value)

  data.append('name', form.value.name.trim())
  data.append('slug', derivedSlug.value)
  data.append('summary', form.value.summary.trim())
  data.append('description', form.value.description.trim())
  data.append('readme', form.value.readme.trim())
  data.append('category', form.value.category)
  data.append('gameVersion', form.value.gameVersion)
  for (const tag of tags.value) data.append('tags', tag)
  if (form.value.sourceUrl) data.append('sourceUrl', form.value.sourceUrl)
  if (form.value.issuesUrl) data.append('issuesUrl', form.value.issuesUrl)
  if (form.value.license) data.append('license', form.value.license)
  if (form.value.licenseUrl) data.append('licenseUrl', form.value.licenseUrl)
  if (form.value.donationUrl) data.append('donationUrl', form.value.donationUrl)
  if (form.value.discordUrl) data.append('discordUrl', form.value.discordUrl)
  if (icon.value) data.append('icon', icon.value)
  for (const file of gallery.value) data.append('gallery', file)
  return data
}

async function submit(): Promise<void> {
  error.value = ''
  if (!canSubmit.value) {
    error.value = '请补全必填项后再提交。'
    return
  }

  submitting.value = true
  try {
    if (versionOnly.value) {
      await pluginsApi.addVersion(targetPluginId.value, buildForm())
      snackbar.success('已提交，等待管理员审核')
      await router.push(detailRoute(kind.value, target.value?.slug ?? targetPluginId.value))
    } else {
      const result = await pluginsApi.create(buildForm())
      snackbar.success('已提交，等待管理员审核')
      await router.push(detailRoute(result.addon.kind, result.addon.slug))
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  void loadVersions()
  if (!targetPluginId.value) return
  loadingTarget.value = true
  try {
    const result = await pluginsApi.detail(targetPluginId.value)
    kind.value = result.addon.kind
    target.value = result.addon
    if (!result.addon.canManage) {
      notAuthor.value = true
      error.value = '你不是该插件的作者，无法为它发布新版本（管理员也只能隐藏，不能代发版本）。'
      return
    }
    form.value.category = result.addon.category
    form.value.gameVersion = result.addon.gameVersion
    gameVersions.value = [result.addon.gameVersion]
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '无法加载目标插件'
  } finally {
    loadingTarget.value = false
  }
})
</script>

<template>
  <div class="sc-upload sc-shell">
    <header class="sc-upload__head">
      <M3Button variant="text" :icon="IconArrowBack" @click="router.back()">返回</M3Button>
      <h1 class="md-typescale-headline-medium">
        {{ versionOnly ? `为「${target?.name ?? '资源'}」发布新版本` : '发布资源' }}
      </h1>
      <p class="md-typescale-body-large sc-muted">
        {{
          versionOnly
            ? '填写版本信息并上传插件包。新版本需要管理员审核通过后，其他服主才能下载。'
            : '填写插件信息并上传打包好的插件文件。提交后进入审核，管理员通过后才会对公众可见。'
        }}
      </p>
    </header>

    <p v-if="error" class="sc-upload__error md-typescale-body-medium">{{ error }}</p>

    <div class="sc-upload__layout">
      <form class="sc-upload__form" @submit.prevent="submit">
        <!-- ---------- 资源类型 ---------- -->
        <section v-if="!versionOnly" class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconTune" :size="20" />
            资源类型
          </h2>
          <div class="sc-upload__kinds">
            <button
              v-for="option in KINDS"
              :key="option.key"
              type="button"
              class="sc-upload__kind-option"
              :class="{ 'is-on': kind === option.key }"
              @click="kind = option.key"
            >
              <span class="md-typescale-title-small">{{ option.label }}（{{ option.extension }}）</span>
              <span class="md-typescale-body-small sc-muted">{{ option.description }}</span>
            </button>
          </div>
          <p class="md-typescale-body-small sc-muted">
            类型创建后不可更改，之后的版本必须使用同一种包格式。插件与模组在平台上分属两块独立的板。
          </p>
        </section>

        <!-- ---------- Package ---------- -->
        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconCloudUpload" :size="20" />
            插件包
          </h2>
          <FileDrop
            v-model="pkg"
            :accept="acceptForKind(kind)"
            :label="`拖入 ${currentKind.extension} 文件，或点击选择`"
            :hint="versionOnly
              ? `该资源是${KIND_LABELS[kind]}，请上传 ${currentKind.extension} 文件。最大 64 MB`
              : `${KIND_LABELS[kind]}请上传 ${currentKind.extension} 文件。最大 64 MB`"
            :max-bytes="MAX_PLUGIN_BYTES"
          />
          <p v-if="kind === 'mod'" class="sc-upload__kind md-typescale-body-small">
            <M3Icon :icon="IconPublic" :size="14" />
            这是<strong>模组</strong>（.netmod）：服务器会把它下发到客户端，请确认你了解它对玩家的影响。
          </p>
        </section>

        <!-- ---------- Version ---------- -->
        <section class="sc-form-card">
          <h2 class="sc-form-card__title md-typescale-title-medium">
            <M3Icon :icon="IconRocketLaunch" :size="20" />
            版本信息
          </h2>

          <div class="sc-field-row">
            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">版本号 *</span>
              <input v-model="form.version" class="sc-input md-typescale-body-medium" placeholder="例如 1.2.0" />
            </label>
            <div class="sc-field">
              <span class="sc-field__label md-typescale-label-large">发布渠道</span>
              <M3SegmentedButton
                :options="RELEASE_CHANNELS.map((c) => ({ value: c.key, label: c.label }))"
                :model-value="form.channel"
                @update:model-value="(v) => (form.channel = v)"
              />
            </div>
          </div>

          <div class="sc-field">
            <span class="sc-field__label md-typescale-label-large">兼容的游戏版本</span>
            <div class="sc-chips">
              <M3Chip
                v-for="version in versionOptions"
                :key="version"
                :label="version"
                variant="filter"
                :selected="gameVersions.includes(version)"
                @click="toggleVersion(version)"
              />
            </div>
          </div>

          <div class="sc-field">
            <ScMarkdownEditor
              v-model="form.changelog"
              label="更新日志"
              :rows="5"
              :max-length="20000"
              placeholder="- 新增：…&#10;- 修复：…"
              hint="版本卡片里可展开查看，支持 Markdown"
            />
          </div>

          <label class="sc-field">
            <span class="sc-field__label md-typescale-label-large">依赖（可选）</span>
            <input
              v-model="form.dependencies"
              class="sc-input md-typescale-body-medium"
              placeholder="用逗号分隔，例如 SCForgeCore, SomeLib"
            />
          </label>
        </section>

        <!-- ---------- Plugin metadata ---------- -->
        <template v-if="!versionOnly">
          <section class="sc-form-card">
            <h2 class="sc-form-card__title md-typescale-title-medium">
              <M3Icon :icon="IconInfo" :size="20" />
              基本信息
            </h2>

            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">插件名称 *</span>
              <input v-model="form.name" class="sc-input md-typescale-body-medium" maxlength="80" placeholder="例如 领地保护" />
            </label>

            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">
                访问标识（slug）
                <M3Tooltip text="用于链接地址，仅允许小写字母、数字与连字符">
                  <M3Icon :icon="IconInfo" :size="14" />
                </M3Tooltip>
              </span>
              <input
                v-model="form.slug"
                class="sc-input md-typescale-body-medium"
                :placeholder="derivedSlug || 'land-claim'"
                @input="slugTouched = true"
              />
              <span class="sc-field__hint md-typescale-body-small sc-muted">
                最终地址：/plugins/{{ derivedSlug || 'your-plugin' }}
              </span>
            </label>

            <label class="sc-field">
              <span class="sc-field__label md-typescale-label-large">一句话简介 *</span>
              <input
                v-model="form.summary"
                class="sc-input md-typescale-body-medium"
                maxlength="200"
                placeholder="用一句话说明这个插件做什么"
              />
            </label>

            <div class="sc-field">
              <ScMarkdownEditor
                v-model="form.description"
                label="详细描述 *"
                :rows="6"
                :max-length="20000"
                placeholder="功能、用法、注意事项…支持 Markdown（标题、列表、表格、代码块、链接）"
                hint="详情页会以 Markdown 渲染；提交后进入审核"
              />
            </div>

            <div class="sc-field">
              <ScMarkdownEditor
                v-model="form.readme"
                label="README（可选，适合较长的安装与配置说明）"
                :rows="8"
                :max-length="60000"
                placeholder="## 安装&#10;&#10;1. 把插件包放进 plugins 目录&#10;2. 重启服务器"
                hint="与详细描述分开显示，同样支持 Markdown"
              />
            </div>

            <div class="sc-field-row">
              <label class="sc-field">
                <span class="sc-field__label md-typescale-label-large">分类 *</span>
                <select v-model="form.category" class="sc-input md-typescale-body-medium">
                  <option value="" disabled>请选择分类</option>
                  <option v-for="option in CATEGORIES" :key="option.key" :value="option.key">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="sc-field">
                <span class="sc-field__label md-typescale-label-large">主要游戏版本 *</span>
                <select v-model="form.gameVersion" class="sc-input md-typescale-body-medium">
                  <option value="" disabled>请选择版本</option>
                  <option v-for="version in versionOptions" :key="version" :value="version">{{ version }}</option>
                </select>
              </label>
            </div>

            <div class="sc-field">
              <span class="sc-field__label md-typescale-label-large">
                <M3Icon :icon="IconTag" :size="16" />
                标签（最多 {{ MAX_TAGS }} 个）
              </span>
              <div class="sc-chips">
                <M3Chip
                  v-for="tag in TAGS"
                  :key="tag.key"
                  :label="tag.label"
                  variant="filter"
                  :selected="tags.includes(tag.key)"
                  @click="toggleTag(tag.key)"
                />
              </div>
            </div>
          </section>

          <section class="sc-form-card">
            <h2 class="sc-form-card__title md-typescale-title-medium">
              <M3Icon :icon="IconStorage" :size="20" />
              图标与截图
            </h2>

            <FileDrop
              v-model="icon"
              accept="image/png,image/jpeg,image/webp,image/gif"
              label="上传插件图标"
              hint="建议 1:1 正方形，JPG / PNG / WebP / GIF；服务端会统一转为 WebP"
              :max-bytes="MAX_IMAGE_BYTES"
              preview
            />

            <div class="sc-field">
              <span class="sc-field__label md-typescale-label-large">截图（最多 {{ MAX_GALLERY }} 张）</span>
              <input
                class="sc-input md-typescale-body-medium"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                @change="onGalleryInput"
              />
              <ul v-if="gallery.length" class="sc-gallery-list">
                <li v-for="(file, index) in gallery" :key="file.name">
                  <span class="sc-truncate">{{ file.name }}</span>
                  <M3Button variant="text" size="sm" @click="removeGallery(index)">移除</M3Button>
                </li>
              </ul>
            </div>
          </section>

          <section class="sc-form-card">
            <h2 class="sc-form-card__title md-typescale-title-medium">
              <M3Icon :icon="IconTune" :size="20" />
              外部链接（可选）
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
        </template>

        <div class="sc-upload__actions">
          <M3Button variant="text" @click="router.back()">取消</M3Button>
          <M3Button
            variant="filled"
            size="lg"
            type="submit"
            :icon="IconRocketLaunch"
            :disabled="!canSubmit"
          >
            {{ submitting ? '正在发布…' : versionOnly ? '发布新版本' : `发布${KIND_LABELS[kind]}` }}
          </M3Button>
        </div>
      </form>

      <aside class="sc-upload__side">
        <section class="sc-side-card">
          <h2 class="sc-side-card__title md-typescale-title-small">
            <M3Icon :icon="IconInventory2" :size="18" />
            发布清单
          </h2>
          <ul class="sc-checklist">
            <li :class="{ 'is-done': pkg }">插件文件已选择</li>
            <li :class="{ 'is-done': form.version.trim() }">版本号已填写</li>
            <li v-if="!versionOnly" :class="{ 'is-done': form.name.trim() }">名称已填写</li>
            <li v-if="!versionOnly" :class="{ 'is-done': form.summary.trim() }">一句话简介已填写</li>
            <li v-if="!versionOnly" :class="{ 'is-done': form.description.trim() }">详细描述已填写</li>
            <li v-if="!versionOnly" :class="{ 'is-done': form.category }">分类已选择</li>
            <li v-if="!versionOnly" :class="{ 'is-done': form.gameVersion }">游戏版本已选择</li>
          </ul>
          <p class="md-typescale-body-small sc-muted sc-upload__review-hint">
            提交后会进入待审核状态，管理员通过后才对公众可见；之后每次编辑都会重新进入审核。
          </p>
        </section>

        <section class="sc-side-card sc-side-card--muted">
          <h2 class="sc-side-card__title md-typescale-title-small">
            <M3Icon :icon="IconInfo" :size="18" />
            打包约定
          </h2>
          <p class="md-typescale-body-small sc-muted">
            插件直接传编译好的 <code>.dll</code>；模组传 <code>.netmod</code>（会下发到客户端）。
            服务端只读取压缩包根目录的 <code>manifest.json</code>（若存在，用于补全名称与版本号），
            不会解析或执行包内其它内容。
          </p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sc-upload__kinds {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 10px;
}

.sc-upload__kind-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border: none;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  text-align: start;
  cursor: pointer;
}

.sc-upload__kind-option.is-on {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.sc-upload__kind {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-block-start: 8px;
  color: var(--md-sys-color-primary);
}

.sc-upload {
  padding-block: 32px 72px;
}

.sc-upload__head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-block-end: 20px;
}

.sc-upload__head h1 {
  font-family: var(--md-ref-typeface-brand);
}

.sc-upload__error {
  margin-block-end: 16px;
  padding: 12px 16px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.sc-upload__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--sc-sidebar-width);
  gap: 24px;
  align-items: start;
}

.sc-upload__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
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

.sc-field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 16px;
}

.sc-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sc-field__label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-on-surface-variant);
}

.sc-field__hint {
  margin-block-start: 2px;
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
  transition: box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.sc-input:focus-visible {
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}

textarea.sc-input {
  resize: vertical;
  line-height: 1.6;
}

select.sc-input {
  cursor: pointer;
}

.sc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-gallery-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block-start: 8px;
}

.sc-gallery-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  font-size: var(--md-sys-typescale-body-medium-size);
}

.sc-upload__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-block-start: 4px;
}

.sc-upload__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  inset-block-start: calc(var(--sc-header-height) + 16px);
}

.sc-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.sc-checklist li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-medium-size);
}

.sc-checklist li::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-outline);
}

.sc-checklist li.is-done {
  color: var(--md-sys-color-on-surface);
  text-decoration: line-through;
  text-decoration-color: var(--md-sys-color-outline-variant);
}

.sc-checklist li.is-done::before {
  background-color: var(--md-sys-color-primary);
}

@media (max-width: 1023px) {
  .sc-upload__layout {
    grid-template-columns: 1fr;
  }

  .sc-upload__side {
    position: static;
  }
}
</style>
