/**
 * Session state for the signed-in user.
 *
 * SCForge reuses the Cloudery Casdoor cookie session issued by
 * `/identity/auth/*`; this store only caches `/identity/auth/me` for the UI.
 */
import { computed, readonly, ref } from 'vue'
import { authApi } from '@/api/auth'
import type { AccountUser } from '@/api/types'

const user = ref<AccountUser | null>(null)
const loading = ref(false)
let loaded = false
let inflight: Promise<AccountUser | null> | null = null

async function load(force = false): Promise<AccountUser | null> {
  if (loaded && !force) return user.value
  if (inflight) return inflight

  loading.value = true
  inflight = authApi
    .me()
    .then((result) => {
      user.value = result
      loaded = true
      return result
    })
    .catch(() => {
      // A 401 simply means "not signed in" — never surface it as an error.
      user.value = null
      loaded = true
      return null
    })
    .finally(() => {
      loading.value = false
      inflight = null
    })
  return inflight
}

function setUser(value: AccountUser | null): void {
  user.value = value
  loaded = true
}

/** Forget the cached session so the next guard re-checks the cookie. */
function reset(): void {
  user.value = null
  loaded = false
  inflight = null
}

export function useAuth() {
  return {
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated: computed(() => user.value !== null),
    load,
    setUser,
    reset,
  }
}
