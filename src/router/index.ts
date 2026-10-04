import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAdmin } from '@/composables/useAdmin'

/**
 * 导航结构：**插件**与**模组**是两块独立的板。
 * 两者共用同一套页面组件，靠路由 meta.kind 区分；服务端用 `kind` 参数过滤。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { title: 'SCForge · 生存战争插件、模组资源平台' },
  },
  {
    path: '/plugins',
    name: 'plugins',
    component: () => import('@/pages/BrowsePage.vue'),
    meta: { kind: 'plugin', title: '浏览插件' },
  },
  {
    path: '/mods',
    name: 'mods',
    component: () => import('@/pages/BrowsePage.vue'),
    meta: { kind: 'mod', title: '浏览模组' },
  },
  {
    // 编辑路由放在详情之前更直观；段数不同，不会互相干扰。
    path: '/plugins/:slug/edit',
    name: 'plugin-edit',
    component: () => import('@/pages/EditPluginPage.vue'),
    meta: { kind: 'plugin', title: '编辑插件', requiresAuth: true },
  },
  {
    path: '/mods/:slug/edit',
    name: 'mod-edit',
    component: () => import('@/pages/EditPluginPage.vue'),
    meta: { kind: 'mod', title: '编辑模组', requiresAuth: true },
  },
  {
    path: '/plugins/:slug',
    name: 'plugin-detail',
    component: () => import('@/pages/PluginDetailPage.vue'),
    meta: { kind: 'plugin' },
    props: true,
  },
  {
    path: '/mods/:slug',
    name: 'mod-detail',
    component: () => import('@/pages/PluginDetailPage.vue'),
    meta: { kind: 'mod' },
    props: true,
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/pages/UploadPage.vue'),
    meta: { title: '发布资源', requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { title: '我的资源', requiresAuth: true },
  },
  {
    path: '/api-keys',
    name: 'api-keys',
    component: () => import('@/pages/ApiKeysPage.vue'),
    meta: { title: 'API 密钥', requiresAuth: true },
  },
  {
    path: '/admin',
    component: () => import('@/pages/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/pages/admin/AdminDashboardPage.vue'),
        meta: { title: '管理后台' },
      },
      {
        path: 'review',
        name: 'admin-review',
        component: () => import('@/pages/admin/AdminReviewPage.vue'),
        meta: { title: '审核队列' },
      },
      {
        path: 'plugins',
        name: 'admin-plugins',
        component: () => import('@/pages/admin/AdminPluginsPage.vue'),
        meta: { title: '资源管理' },
      },
      {
        path: 'game-versions',
        name: 'admin-game-versions',
        component: () => import('@/pages/admin/AdminGameVersionsPage.vue'),
        meta: { title: '游戏版本' },
      },
      {
        path: 'admins',
        name: 'admin-admins',
        component: () => import('@/pages/admin/AdminAdminsPage.vue'),
        meta: { title: '管理员与权限' },
      },
      {
        // 只有超管能管别人的机器凭据 —— 挂在 requiresAdmin 之下，再由页面自己按身份隐藏按钮。
        path: 'api-keys',
        name: 'admin-api-keys',
        component: () => import('@/pages/admin/AdminApiKeysPage.vue'),
        meta: { title: 'API 密钥' },
      },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/pages/AuthCallbackPage.vue'),
    meta: { title: '正在登录' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: '页面不存在' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 88 }
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const auth = useAuth()
    const user = await auth.load()
    if (!user) return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin) {
    // 后台权限由服务端判定；这里只是提前拦掉不该看到后台的用户。
    const admin = useAdmin()
    const me = await admin.load(true)
    if (!me?.isAdmin) return { name: 'home' }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · SCForge` : 'SCForge · 生存战争插件、模组资源平台'
})
