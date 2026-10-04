<script setup lang="ts">
/** 后台外壳：左侧导航 + 子路由。导航项按权限显示，越权请求仍由服务端拦。 */
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import {
  IconAdminPanelSettings,
  IconBlock,
  IconGavel,
  IconInsights,
  IconKey,
  IconPendingActions,
  IconSchedule,
  IconStorage,
} from '@/icons'
import { M3Icon } from '@/components/m3'
import { useAdmin } from '@/composables/useAdmin'

const route = useRoute()
const { me, isAdmin, isSuperAdmin, canReview, canManageContent, load } = useAdmin()

const items = computed(() =>
  [
    { name: 'admin-dashboard', label: '概览', icon: IconInsights, show: true },
    { name: 'admin-review', label: '审核队列', icon: IconPendingActions, show: canReview.value },
    { name: 'admin-plugins', label: '插件管理', icon: IconStorage, show: isAdmin.value },
    { name: 'admin-game-versions', label: '游戏版本', icon: IconSchedule, show: isSuperAdmin.value },
    { name: 'admin-admins', label: '管理员', icon: IconGavel, show: isSuperAdmin.value },
    { name: 'admin-api-keys', label: 'API 密钥', icon: IconKey, show: isSuperAdmin.value },
  ].filter((item) => item.show),
)

onMounted(() => void load())
</script>

<template>
  <div class="sc-admin sc-shell">
    <header class="sc-admin__head">
      <div class="sc-admin__title">
        <span class="sc-admin__mark"><M3Icon :icon="IconAdminPanelSettings" :size="22" /></span>
        <div>
          <h1 class="md-typescale-headline-small">管理后台</h1>
          <p class="md-typescale-body-medium sc-muted">
            {{ me?.username }}
            <span class="md-tag">{{ isSuperAdmin ? '超级管理员' : '管理员' }}</span>
            <span v-if="!isSuperAdmin && !canReview && !canManageContent" class="md-tag md-tag--outlined">
              <M3Icon :icon="IconBlock" :size="12" /> 暂未授予具体权限
            </span>
          </p>
        </div>
      </div>
    </header>

    <nav class="sc-admin__nav" aria-label="后台导航">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        class="sc-admin__link"
        :class="{ 'is-active': route.name === item.name }"
        :to="{ name: item.name }"
      >
        <M3Icon :icon="item.icon" :size="18" />
        <span class="md-typescale-label-large">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <RouterView />
  </div>
</template>

<style scoped>
.sc-admin {
  padding-block: 32px 72px;
}

.sc-admin__head {
  margin-block-end: 16px;
}

.sc-admin__title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sc-admin__title p {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sc-admin__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.sc-admin__nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-block-end: 16px;
  border-block-end: 1px solid var(--md-sys-color-outline-variant);
}

.sc-admin__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding-inline: 14px;
  border-radius: var(--md-sys-shape-corner-full);
  color: var(--md-sys-color-on-surface-variant);
  text-decoration: none;
}

.sc-admin__link.is-active {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
</style>
