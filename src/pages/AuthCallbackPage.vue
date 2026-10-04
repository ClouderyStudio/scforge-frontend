<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconClose, IconLogin, IconSchedule } from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import { authApi } from '@/api/auth'
import { useAuth } from '@/composables/useAuth'
import { useSnackbar } from '@/composables/useSnackbar'

const route = useRoute()
const router = useRouter()
const snackbar = useSnackbar()
const { setUser } = useAuth()

const state = ref<'working' | 'error'>('working')
const message = ref('正在完成登录，请稍候…')

function landing(): string {
  const stored = window.sessionStorage.getItem('scforge:login-redirect')
  return stored && stored.startsWith('/') ? stored : '/'
}

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const oauthState = typeof route.query.state === 'string' ? route.query.state : ''
  const redirectUri = window.sessionStorage.getItem('scforge:callback-uri') ?? `${window.location.origin}/auth/callback`

  if (!code || !oauthState) {
    state.value = 'error'
    message.value = '登录回调缺少必要参数（code / state），请重新登录。'
    return
  }

  try {
    const result = await authApi.callback(code, oauthState, redirectUri)
    setUser(result.user)
    window.sessionStorage.removeItem('scforge:login-redirect')
    window.sessionStorage.removeItem('scforge:callback-uri')
    snackbar.success(`欢迎回来，${result.user.username}`)
    await router.replace(landing())
  } catch (caught) {
    state.value = 'error'
    message.value = caught instanceof Error ? caught.message : '登录失败，请重试。'
  }
})
</script>

<template>
  <div class="sc-callback">
    <div class="sc-callback__panel">
      <span class="sc-callback__icon" :class="{ 'is-error': state === 'error' }">
        <M3Icon :icon="state === 'error' ? IconClose : IconSchedule" :size="30" />
      </span>
      <h1 class="md-typescale-headline-small">
        {{ state === 'error' ? '登录未完成' : '正在登录' }}
      </h1>
      <p class="md-typescale-body-large sc-muted">{{ message }}</p>
      <M3Button
        v-if="state === 'error'"
        variant="filled"
        :icon="IconLogin"
        @click="router.replace({ name: 'login' })"
      >
        返回登录
      </M3Button>
    </div>
  </div>
</template>

<style scoped>
.sc-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - var(--md-sys-top-app-bar-height) - 240px);
  padding: 48px 16px;
}

.sc-callback__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 480px;
  padding: 32px;
  border-radius: var(--md-sys-shape-corner-extra-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: var(--md-sys-elevation-level1);
  text-align: center;
}

.sc-callback__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  animation: sc-callback-pulse 1.6s var(--md-sys-motion-easing-standard) infinite;
}

.sc-callback__icon.is-error {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  animation: none;
}

@keyframes sc-callback-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
