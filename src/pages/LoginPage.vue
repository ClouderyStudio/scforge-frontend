<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconArrowForward, IconDeployedCode, IconLock, IconLogin, IconShield, IconStorage } from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import { authApi } from '@/api/auth'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { load } = useAuth()

const busy = ref(false)
const error = ref('')

const benefits = [
  { icon: IconStorage, title: '发布与管理插件', text: '上传插件包、追加版本、维护简介与链接。' },
  { icon: IconShield, title: '评论与赞踩', text: '参与讨论，为插件打分，帮助其他服主做选择。' },
  { icon: IconDeployedCode, title: '云术统一身份', text: '使用云术（Cloudery）账号即可登录，无需单独注册。' },
]

function redirectTarget(): string {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : '/'
}

/**
 * Kick off the Casdoor authorization-code flow.
 *
 * The API leaves the user on their own callback page, so the redirect back to
 * this app carries `code` and `state`; the callback page finishes the exchange.
 */
async function startLogin(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    const [config, stateResult] = await Promise.all([authApi.config(), authApi.state()])
    const redirectUri = `${window.location.origin}/auth/callback`
    const authorizeUrl = new URL(`${config.casdoor.endpoint}/login/oauth/authorize`)
    authorizeUrl.searchParams.set('client_id', config.casdoor.clientId)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('redirect_uri', redirectUri)
    authorizeUrl.searchParams.set('scope', config.casdoor.scope)
    authorizeUrl.searchParams.set('state', stateResult.state)

    // Remember where to land once the callback finishes.
    window.sessionStorage.setItem('scforge:login-redirect', redirectTarget())
    window.sessionStorage.setItem('scforge:callback-uri', redirectUri)
    window.location.assign(authorizeUrl.toString())
  } catch (caught) {
    busy.value = false
    error.value = caught instanceof Error ? caught.message : '无法连接登录服务，请稍后再试'
  }
}

onMounted(async () => {
  const user = await load()
  if (user) void router.replace(redirectTarget())
})
</script>

<template>
  <div class="sc-login">
    <div class="sc-login__backdrop" aria-hidden="true" />
    <div class="sc-shell sc-login__grid">
      <section class="sc-login__intro">
        <p class="sc-login__eyebrow md-typescale-label-large">
          <M3Icon :icon="IconDeployedCode" :size="16" />
          SCForge
        </p>
        <h1 class="md-typescale-display-small">登录后开始<br />发布与讨论</h1>
        <p class="md-typescale-body-large sc-muted">
          SCForge 使用云术统一身份认证（Casdoor）。登录成功后，你可以在本平台发布插件、评论和投票。
        </p>

        <ul class="sc-login__benefits">
          <li v-for="item in benefits" :key="item.title">
            <span class="sc-login__benefit-icon"><M3Icon :icon="item.icon" :size="20" /></span>
            <div>
              <p class="md-typescale-title-small">{{ item.title }}</p>
              <p class="md-typescale-body-medium sc-muted">{{ item.text }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="sc-login__panel">
        <h2 class="md-typescale-headline-small">登录</h2>
        <p class="md-typescale-body-medium sc-muted">
          点击下方按钮将跳转到云术统一身份认证页面，完成后会自动返回这里。
        </p>

        <p v-if="error" class="sc-login__error md-typescale-body-medium">{{ error }}</p>

        <M3Button
          block
          variant="filled"
          size="lg"
          :icon="IconLogin"
          :disabled="busy"
          @click="startLogin"
        >
          {{ busy ? '正在跳转…' : '使用云术账号登录' }}
        </M3Button>

        <M3Button block variant="text" :trailing-icon="IconArrowForward" @click="router.push({ name: 'plugins' })">
          先浏览插件
        </M3Button>

        <p class="sc-login__note md-typescale-body-small sc-muted">
          <M3Icon :icon="IconLock" :size="14" />
          登录会话保存在 HttpOnly Cookie 中，前端代码无法读取，降低被盗风险。
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sc-login {
  position: relative;
  min-height: calc(100dvh - var(--md-sys-top-app-bar-height) - 200px);
  padding-block: clamp(40px, 8vw, 80px);
}

.sc-login__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(46% 60% at 10% 0%, color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent), transparent 70%),
    radial-gradient(40% 60% at 92% 10%, color-mix(in srgb, var(--md-sys-color-tertiary) 18%, transparent), transparent 72%);
  pointer-events: none;
}

.sc-login__grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 420px);
  gap: 40px;
  align-items: center;
}

.sc-login__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding-inline: 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.sc-login__intro h1 {
  margin-block: 16px 12px;
  font-family: var(--md-ref-typeface-brand);
}

.sc-login__benefits {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-block-start: 28px;
}

.sc-login__benefits li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.sc-login__benefit-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
}

.sc-login__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px;
  border-radius: var(--md-sys-shape-corner-extra-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: var(--md-sys-elevation-level2);
}

.sc-login__error {
  padding: 10px 14px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.sc-login__note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-block-start: 4px;
}

@media (max-width: 900px) {
  .sc-login__grid {
    grid-template-columns: 1fr;
  }
}
</style>
