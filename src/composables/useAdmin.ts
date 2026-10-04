/**
 * 后台身份的模块级缓存。
 *
 * 页头入口与路由守卫都要问「我是不是管理员」，所以只在登录态变化或显式刷新时请求一次
 * /scforge/admin/me；未登录 / 非管理员都会拿到 isAdmin=false（不是错误）。
 */
import { computed, ref } from 'vue'
import { adminApi } from '@/api/admin'
import { ApiError } from '@/api/http'
import type { AdminMe } from '@/api/types'

const me = ref<AdminMe | null>(null)
const loading = ref(false)
let loaded = false
let inflight: Promise<AdminMe | null> | null = null

async function load(force = false): Promise<AdminMe | null> {
  if (loaded && !force) return me.value
  if (inflight) return inflight

  loading.value = true
  inflight = adminApi
    .me()
    .then((result) => {
      me.value = result
      loaded = true
      return result
    })
    .catch((error: unknown) => {
      // 未登录（401）也算「不是管理员」，不往上抛。
      if (!(error instanceof ApiError)) console.warn(error)
      me.value = null
      loaded = true
      return null
    })
    .finally(() => {
      loading.value = false
      inflight = null
    })

  return inflight
}

function reset(): void {
  me.value = null
  loaded = false
  inflight = null
}

export function useAdmin() {
  return {
    me: computed(() => me.value),
    loading: computed(() => loading.value),
    isAdmin: computed(() => me.value?.isAdmin === true),
    isSuperAdmin: computed(() => me.value?.isSuperAdmin === true),
    canReview: computed(() => me.value?.permissions.includes('review') === true || me.value?.isSuperAdmin === true),
    canManageContent: computed(
      () => me.value?.permissions.includes('content') === true || me.value?.isSuperAdmin === true,
    ),
    load,
    reset,
  }
}
