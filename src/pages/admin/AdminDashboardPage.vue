<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconBlock,
  IconDownload,
  IconGavel,
  IconPendingActions,
  IconStorage,
  IconTaskAlt,
} from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import { adminApi } from '@/api/admin'
import type { AdminSummary } from '@/api/types'
import { useAdmin } from '@/composables/useAdmin'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatCount } from '@/utils/format'

const router = useRouter()
const snackbar = useSnackbar()
const { canReview, canManageContent, isSuperAdmin } = useAdmin()

const summary = ref<AdminSummary | null>(null)
const loading = ref(true)

const cards = computed(() => [
  { key: 'pendingPlugins', label: '待审核插件', value: summary.value?.pendingPlugins ?? 0, icon: IconPendingActions, to: 'admin-review' },
  { key: 'pendingVersions', label: '待审核版本', value: summary.value?.pendingVersions ?? 0, icon: IconStorage, to: 'admin-review' },
  { key: 'publishedPlugins', label: '已发布插件', value: summary.value?.publishedPlugins ?? 0, icon: IconTaskAlt, to: 'admin-plugins' },
  { key: 'rejectedPlugins', label: '已驳回插件', value: summary.value?.rejectedPlugins ?? 0, icon: IconBlock, to: 'admin-plugins' },
  { key: 'totalDownloads', label: '累计下载', value: summary.value?.totalDownloads ?? 0, icon: IconDownload },
  { key: 'admins', label: '管理员', value: summary.value?.admins ?? 0, icon: IconGavel, to: 'admin-admins' },
])

onMounted(async () => {
  try {
    summary.value = await adminApi.summary()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="sc-admin-body">
    <p class="md-typescale-body-large sc-muted">
      这里是 SCForge 的后台概览。插件与版本都是<b>先审后发</b>，待审核数量就是当前需要你处理的积压。
    </p>

    <div class="sc-admin-cards">
      <button
        v-for="card in cards"
        :key="card.key"
        type="button"
        class="sc-admin-card"
        :class="{ 'is-clickable': card.to }"
        :disabled="!card.to"
        @click="card.to && router.push({ name: card.to })"
      >
        <span class="sc-admin-card__icon"><M3Icon :icon="card.icon" :size="20" /></span>
        <span class="md-typescale-display-small">{{ loading ? '—' : formatCount(card.value) }}</span>
        <span class="md-typescale-body-medium sc-muted">{{ card.label }}</span>
      </button>
    </div>

    <div class="sc-admin-quick">
      <M3Button v-if="canReview" variant="filled" :icon="IconPendingActions" @click="router.push({ name: 'admin-review' })">
        去审核队列
      </M3Button>
      <M3Button v-if="canManageContent" variant="outlined" :icon="IconStorage" @click="router.push({ name: 'admin-plugins' })">
        管理全部插件
      </M3Button>
      <M3Button v-if="isSuperAdmin" variant="outlined" :icon="IconGavel" @click="router.push({ name: 'admin-admins' })">
        管理员与权限
      </M3Button>
    </div>
  </section>
</template>

<style scoped>
.sc-admin-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-block: 24px;
}

.sc-admin-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 12px;
}

.sc-admin-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px;
  border: none;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  color: inherit;
  text-align: start;
}

.sc-admin-card.is-clickable {
  cursor: pointer;
}

.sc-admin-card.is-clickable:hover {
  background-color: var(--md-sys-color-surface-container);
}

.sc-admin-card__icon {
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

.sc-admin-quick {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
