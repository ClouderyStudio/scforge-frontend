<script setup lang="ts">
import { boardRoute } from '@/data/catalog'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconAdd,
  IconAdminPanelSettings,
  IconDarkMode,
  IconKey,
  IconLightMode,
  IconLogin,
  IconLogout,
  IconMenu,
  IconPerson,
  IconSearch,
  IconTune,
  IconUpload,
  IconDeployedCode,
} from '@/icons'
import {
  M3Avatar,
  M3Button,
  M3Icon,
  M3IconButton,
  M3Menu,
  M3MenuItem,
  M3Sheet,
  M3Tooltip,
} from '@/components/m3'
import { useAuth } from '@/composables/useAuth'
import { useAdmin } from '@/composables/useAdmin'
import { studio } from '@/data/brand'
import { useScrolled } from '@/composables/useScrolled'
import { useTheme } from '@/composables/useTheme'
import { authApi } from '@/api/auth'
import { useSnackbar } from '@/composables/useSnackbar'

const route = useRoute()
const router = useRouter()
const { scrolled } = useScrolled(8)
const { isDark, toggle } = useTheme()
const { user, isAuthenticated, reset } = useAuth()
const { isAdmin, load: loadAdmin, reset: resetAdmin } = useAdmin()
void loadAdmin()
const snackbar = useSnackbar()

const term = ref(typeof route.query.q === 'string' ? route.query.q : '')
const drawerOpen = ref(false)

// 紧凑视口下顶栏不放行内搜索框（它会把顶栏顶到 416px，见 .sc-header__search 注释），
// 改成一个搜索图标，点开后用抽屉里那个完整宽度的搜索框——所以抽屉要区分「导航」与「搜索」两种来意。
const drawerIntent = ref<'nav' | 'search'>('nav')
const drawerTitle = computed(() => (drawerIntent.value === 'search' ? '搜索' : '导航'))
const drawerSearchRef = ref<HTMLInputElement | null>(null)
let searchFocusTimer: number | undefined

function clearSearchFocusTimer(): void {
  if (searchFocusTimer !== undefined) {
    window.clearTimeout(searchFocusTimer)
    searchFocusTimer = undefined
  }
}

function openDrawer(intent: 'nav' | 'search' = 'nav'): void {
  drawerIntent.value = intent
  drawerOpen.value = true
  clearSearchFocusTimer()
  if (intent !== 'search') return
  // useModal 会在抽屉进场后把焦点交给第一个可聚焦元素（头部的关闭按钮），
  // 这里等它落定再把焦点抢到搜索框上，移动端顺带拉起软键盘。
  searchFocusTimer = window.setTimeout(() => {
    searchFocusTimer = undefined
    drawerSearchRef.value?.focus({ preventScroll: true })
    drawerSearchRef.value?.select()
  }, 240)
}

onBeforeUnmount(clearSearchFocusTimer)

// 浏览是**一张**页面：插件 / 模组在页面内切换，导航栏不拆成两项。
// 已经在模组板时，「浏览」继续指向模组板，免得点一下又被弹回插件板。
const navItems = computed(() => [
  { label: '浏览', name: route.meta.kind === 'mod' ? 'mods' : 'plugins', icon: IconDeployedCode },
  { label: '发布', name: 'upload', icon: IconAdd },
])

// 后台入口只在服务端确认是管理员后出现（非管理员进后台也会被守卫挡回首页）。
const adminEntry = computed(() => (isAdmin.value ? { label: '管理后台', name: 'admin-dashboard', icon: IconAdminPanelSettings } : null))

const initialsName = computed(() => user.value?.username ?? '')

function submitSearch(): void {
  const q = term.value.trim()
  drawerOpen.value = false
  // 在当前的板内搜索：模组板里搜模组，插件板里搜插件。
  void router.push({ ...boardRoute((route.meta.kind as string | undefined) ?? 'plugin'), query: q ? { q } : {} })
}

async function signOut(): Promise<void> {
  try {
    const result = await authApi.logout()
    reset()
    resetAdmin()
    snackbar.success('已退出登录')
    // Clear the Casdoor-side session too, then come back to the catalogue.
    if (result?.casdoorLogoutUrl) {
      window.location.assign(`${result.casdoorLogoutUrl}?redirect=${encodeURIComponent(window.location.origin)}`)
      return
    }
  } catch {
    reset()
    resetAdmin()
    snackbar.success('已退出登录')
  }
  void router.push({ name: 'home' })
}
</script>

<template>
  <header class="sc-header" :class="{ 'is-scrolled': scrolled }">
    <div class="sc-header__inner sc-shell">
      <RouterLink
        class="sc-header__brand"
        :to="{ name: 'home' }"
        :aria-label="`${studio.name} · SCForge 首页`"
      >
        <span class="sc-header__mark" aria-hidden="true">
          <M3Icon :icon="IconDeployedCode" :size="22" />
        </span>
        <span class="sc-header__names">
          <span class="sc-header__wordmark md-typescale-title-medium">SCForge</span>
          <span class="sc-header__studio">{{ studio.name }} · {{ studio.nameEn }}</span>
        </span>
      </RouterLink>

      <form class="sc-header__search sc-hide-compact" role="search" @submit.prevent="submitSearch">
        <M3Icon :icon="IconSearch" :size="20" class="sc-header__search-icon" />
        <input
          v-model="term"
          class="sc-header__search-input md-typescale-body-medium"
          type="search"
          name="q"
          placeholder="搜索插件、作者或标签…"
          aria-label="搜索插件"
        />
      </form>

      <nav class="sc-header__nav sc-hide-compact" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          class="sc-header__link"
          :class="{ 'is-active': route.name === item.name }"
          :to="{ name: item.name }"
        >
          <M3Icon :icon="item.icon" :size="18" />
          <span class="md-typescale-label-large">{{ item.label }}</span>
        </RouterLink>

        <RouterLink
          v-if="adminEntry"
          class="sc-header__link"
          :class="{ 'is-active': String(route.name).startsWith('admin-') }"
          :to="{ name: adminEntry.name }"
        >
          <M3Icon :icon="adminEntry.icon" :size="18" />
          <span class="md-typescale-label-large">{{ adminEntry.label }}</span>
        </RouterLink>
      </nav>

      <div class="sc-header__actions">
        <M3IconButton
          class="sc-only-compact"
          :icon="IconSearch"
          label="搜索"
          variant="standard"
          @click="openDrawer('search')"
        />

        <M3Tooltip :text="isDark ? '切换到浅色' : '切换到深色'">
          <M3IconButton
            :icon="isDark ? IconLightMode : IconDarkMode"
            :label="isDark ? '切换到浅色主题' : '切换到深色主题'"
            variant="standard"
            @click="toggle"
          />
        </M3Tooltip>

        <M3Menu v-if="isAuthenticated" placement="bottom-end" :min-width="220">
          <template #trigger="{ open }">
            <button class="sc-header__avatar" type="button" :aria-expanded="open" aria-label="账户菜单">
              <M3Avatar :src="user?.avatar ?? undefined" :name="initialsName" :size="34" />
            </button>
          </template>

          <div class="sc-header__account">
            <p class="md-typescale-title-small">{{ user?.username }}</p>
            <p class="md-typescale-body-small sc-muted">{{ user?.email || '未提供邮箱' }}</p>
          </div>
          <M3MenuItem :icon="IconPerson" label="我的插件" @click="router.push({ name: 'dashboard' })" />
          <M3MenuItem :icon="IconKey" label="API 密钥" @click="router.push({ name: 'api-keys' })" />
          <M3MenuItem :icon="IconUpload" label="发布新插件" @click="router.push({ name: 'upload' })" />
          <M3MenuItem
            v-if="isAdmin"
            :icon="IconAdminPanelSettings"
            label="管理后台"
            @click="router.push({ name: 'admin-dashboard' })"
          />
          <M3MenuItem :icon="IconLogout" label="退出登录" @click="signOut" />
        </M3Menu>

        <M3Button
          v-else
          class="sc-hide-compact"
          variant="filled"
          size="sm"
          :icon="IconLogin"
          @click="router.push({ name: 'login', query: { redirect: route.fullPath } })"
        >
          登录
        </M3Button>

        <M3IconButton
          class="sc-only-compact"
          :icon="IconMenu"
          label="打开导航菜单"
          variant="standard"
          @click="openDrawer('nav')"
        />
      </div>
    </div>
  </header>

  <M3Sheet v-model="drawerOpen" side="end" size="min(320px, 86vw)" :title="drawerTitle">
    <div class="sc-drawer">
      <form class="sc-drawer__search" role="search" @submit.prevent="submitSearch">
        <M3Icon :icon="IconSearch" :size="20" />
        <input
          ref="drawerSearchRef"
          v-model="term"
          class="sc-drawer__input md-typescale-body-medium"
          type="search"
          name="q"
          placeholder="搜索插件 / 模组…"
          aria-label="搜索插件与模组"
        />
      </form>

      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        class="sc-drawer__link md-typescale-body-large"
        :to="{ name: item.name }"
        @click="drawerOpen = false"
      >
        <M3Icon :icon="item.icon" :size="20" />
        {{ item.label }}
      </RouterLink>

      <RouterLink
        v-if="isAuthenticated"
        class="sc-drawer__link md-typescale-body-large"
        :to="{ name: 'dashboard' }"
        @click="drawerOpen = false"
      >
        <M3Icon :icon="IconPerson" :size="20" />
        我的插件
      </RouterLink>
      <RouterLink
        v-if="isAuthenticated"
        class="sc-drawer__link md-typescale-body-large"
        :to="{ name: 'api-keys' }"
        @click="drawerOpen = false"
      >
        <M3Icon :icon="IconKey" :size="20" />
        API 密钥
      </RouterLink>
      <RouterLink
        v-else
        class="sc-drawer__link md-typescale-body-large"
        :to="{ name: 'login' }"
        @click="drawerOpen = false"
      >
        <M3Icon :icon="IconLogin" :size="20" />
        登录
      </RouterLink>

      <RouterLink
        v-if="isAdmin"
        class="sc-drawer__link md-typescale-body-large"
        :to="{ name: 'admin-dashboard' }"
        @click="drawerOpen = false"
      >
        <M3Icon :icon="IconAdminPanelSettings" :size="20" />
        管理后台
      </RouterLink>

      <RouterLink class="sc-drawer__link md-typescale-body-large" :to="{ name: 'plugins' }" @click="drawerOpen = false">
        <M3Icon :icon="IconTune" :size="20" />
        筛选与排序
      </RouterLink>
    </div>
  </M3Sheet>
</template>

<style scoped>
.sc-header__names {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.sc-header__studio {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--md-sys-color-on-surface-variant);
}

@media (max-width: 479px) {
  .sc-header__studio {
    display: none;
  }
}
.sc-header {
  position: sticky;
  inset-block-start: 0;
  z-index: 80;
  background-color: color-mix(in srgb, var(--md-sys-color-surface) 88%, transparent);
  backdrop-filter: blur(14px);
  border-block-end: 1px solid transparent;
  transition:
    background-color var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard),
    border-color var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
}

.sc-header.is-scrolled {
  background-color: color-mix(in srgb, var(--md-sys-color-surface-container) 92%, transparent);
  border-block-end-color: var(--md-sys-color-outline-variant);
}

.sc-header__inner {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: var(--md-sys-top-app-bar-height);
}

.sc-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: var(--md-sys-color-on-surface);
}

.sc-header__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: linear-gradient(
    135deg,
    var(--md-sys-color-primary),
    var(--md-sys-color-tertiary)
  );
  color: var(--md-sys-color-on-primary);
}

.sc-header__wordmark {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.sc-header__search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  /* flex 项的 min-width:auto 会让宽度下限落到 <input> 的固有宽度上（约 180px），
     头部的最小宽度被撑到 416px —— 比任何手机都宽，整页因此可横向拖拽。
     置 0 之后搜索框才能真正随视口收缩。 */
  min-width: 0;
  max-width: 520px;
  height: 44px;
  padding-inline: 14px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  transition: background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.sc-header__search:focus-within {
  background-color: var(--md-sys-color-surface-container-highest);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-primary);
}

.sc-header__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.sc-header__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
}

.sc-header__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding-inline: 14px;
  border-radius: var(--md-sys-shape-corner-full);
  color: var(--md-sys-color-on-surface-variant);
  transition:
    background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

@media (hover: hover) {
  .sc-header__link:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
  }
}

.sc-header__link.is-active {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sc-header__avatar {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
}

.sc-header__account {
  padding: 8px 16px 10px;
}

/* ---------- Drawer ---------- */
.sc-drawer {
  display: flex;
  flex-direction: column;
  padding: 8px;
}

.sc-drawer__search {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 同 .sc-header__search：不置 0 就会被 input 的固有宽度顶穿抽屉外框。 */
  min-width: 0;
  height: 48px;
  padding-inline: 14px;
  margin-block-end: 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}

.sc-drawer__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.sc-drawer__link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding-inline: 14px;
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface);
}

@media (hover: hover) {
  .sc-drawer__link:hover {
    background-color: var(--md-sys-color-surface-container-high);
  }
}

@media (max-width: 839px) {
  .sc-header__inner {
    gap: 8px;
  }

  /* 行内搜索框在紧凑视口被收起，靠它撑开的「把导航与操作推到右侧」也没了，
     这里补回来，否则操作区会紧贴品牌标。 */
  .sc-header__actions {
    margin-inline-start: auto;
  }
}
</style>
