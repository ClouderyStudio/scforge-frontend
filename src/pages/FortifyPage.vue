<script setup lang="ts">
/**
 * 加固工作台（独立页，/fortify）。
 *
 * 与资源编辑页里的「加固」标签页用的是**同一张**打包卡（PackWorkbench）——
 * 这里多了「选资源」一步，打包完成后密钥自动登记到选中的资源。
 * 密钥管理（列表 / 作废）仍在各资源编辑页的「加固」标签页里。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconAdd,
  IconBlock,
  IconInfo,
  IconKey,
  IconShield,
  IconVerified,
  IconWarning,
} from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import PackWorkbench from '@/components/fortify/PackWorkbench.vue'
import { mineApi } from '@/api/plugins'
import type { PluginSummary } from '@/api/types'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user } = useAuth()

const mine = ref<PluginSummary[]>([])
const loading = ref(true)
const denied = ref(false)
const selected = ref('')

const selectedLabel = computed(
  () => mine.value.find((item) => item.id === selected.value)?.name ?? '',
)

onMounted(async () => {
  try {
    mine.value = (await mineApi.list()).items
  } catch (error) {
    // 401 = 未登录（路由守卫通常会先拦住）；403 = 无权限，交给页面态处理。
    denied.value = true
    void error
  } finally {
    loading.value = false
  }
})

function goUpload(): void {
  void router.push({ name: 'upload' })
}
</script>

<template>
  <div class="sc-fortify-page">
    <header class="sc-fortify-page__head">
      <h1 class="md-typescale-headline-small">
        <M3Icon :icon="IconShield" :size="24" />
        加固工作台
      </h1>
      <p class="md-typescale-body-medium sc-muted">
        给模组包上锁：加密 + 作者签名，玩家改过一个字节都加载不了。
        加密与签名在你的浏览器里完成 —— 私钥与明文 mod 都不会离开这台电脑。
      </p>
    </header>

    <section class="sc-fcard">
      <h2 class="sc-fcard__title md-typescale-title-medium">
        <M3Icon :icon="IconInfo" :size="20" />
        使用须知
      </h2>
      <div class="sc-fortify-page__notes">
        <div class="sc-fortify-page__note">
          <h3 class="md-typescale-title-small">
            <M3Icon :icon="IconVerified" :size="18" />
            它能做什么
          </h3>
          <ul class="md-typescale-body-small">
            <li>AES-256-GCM 加密 + 作者 ECDSA 签名：包被改过<strong>一个字节</strong>都加载不了。</li>
            <li>防二改：换皮、拆包重发、改包名改版本都过不了验签（外层 modinfo 整份签入头部）。</li>
            <li>加密与签名在<strong>你的浏览器</strong>里完成，私钥与明文 mod 都不上传；服务器只收密文。</li>
            <li>加固包自带防二次加固标记，不能被套娃加固来洗白作者身份。</li>
          </ul>
        </div>
        <div class="sc-fortify-page__note">
          <h3 class="md-typescale-title-small">
            <M3Icon :icon="IconWarning" :size="18" />
            局限性（如实说）
          </h3>
          <ul class="md-typescale-body-small">
            <li><strong>需要联网</strong>：打包时要取最新加固壳；玩家加载加固包时也要联网取密钥，离线进不了。</li>
            <li>不防内存转储（dump）：程序集解密进内存后理论上可被转出，加密防的是「随手改与白嫖」，不是绝对保密。</li>
            <li>绕过本工具手搓的嵌套包无法在密码学上阻止，但那需要相当的逆向成本。</li>
          </ul>
        </div>
        <div class="sc-fortify-page__note">
          <h3 class="md-typescale-title-small">
            <M3Icon :icon="IconKey" :size="18" />
            密钥保管（重要）
          </h3>
          <ul class="md-typescale-body-small">
            <li>签名私钥（<code>.key.pem</code>）<strong>只此一份</strong>：丢了就再也签不出同一身份的包，请立即保存到密码管理器或网盘。</li>
            <li>私钥丢了也不用慌：重新生成并登记新密钥即可，<strong>旧包不受影响</strong>（它们内嵌的是旧公钥）。</li>
            <li>每次打包下载的 <code>.secret.json</code>（密钥存档）建议一并保存；AES 加密密钥已登记在服务器，打包时自动使用。</li>
          </ul>
        </div>
        <div class="sc-fortify-page__note">
          <h3 class="md-typescale-title-small">
            <M3Icon :icon="IconBlock" :size="18" />
            使用红线
          </h3>
          <ul class="md-typescale-body-small">
            <li>本工具仅用于保护<strong>你自己的原创模组</strong>，<strong>禁止用于加固外挂、作弊类 mod</strong>。</li>
            <li>不要以为加了壳就查不到：管理方可在复核后查看登记密钥的明文，配合反作弊分析加固包内容。</li>
            <li>加固 ≠ 免责：违规内容照常按站规处理。</li>
          </ul>
        </div>
      </div>
    </section>

    <LoadingSkeleton v-if="loading" />

    <EmptyState
      v-else-if="denied"
      title="需要登录"
      description="登录后才能使用加固工作台。"
    >
      <M3Button variant="filled" @click="router.push({ name: 'login' })">去登录</M3Button>
    </EmptyState>

    <template v-else-if="mine.length === 0">
      <EmptyState
        title="还没有可加固的资源"
        :description="`先发布一个插件或模组（当前身份：${user?.username ?? '未知'}），再回到这里打包。`"
      >
        <M3Button variant="filled" :icon="IconAdd" @click="goUpload">去发布</M3Button>
      </EmptyState>
    </template>

    <template v-else>
      <section class="sc-fcard">
        <h2 class="sc-fcard__title md-typescale-title-medium">① 选择资源</h2>
        <label class="sc-fortify-page__field">
          <span class="md-typescale-label-large sc-muted">登记到哪个资源</span>
          <select v-model="selected" class="sc-fortify-page__select md-typescale-body-medium">
            <option value="" disabled>选择你自己的插件 / 模组…</option>
            <option v-for="item in mine" :key="item.id" :value="item.id">
              {{ item.name }}（{{ item.kind === 'mod' ? '模组' : '插件' }}）
            </option>
          </select>
          <span class="md-typescale-body-small sc-muted">
            密钥挂在资源上：打包成功即登记到它名下；列表与作废在该资源编辑页的「加固」标签页。
          </span>
        </label>
      </section>

      <PackWorkbench :plugin-id="selected || null" />

      <p v-if="selectedLabel" class="md-typescale-body-small sc-muted">
        当前目标：<b>{{ selectedLabel }}</b>
      </p>
    </template>
  </div>
</template>

<style scoped>
.sc-fortify-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-block: 32px 72px;
}

.sc-fortify-page__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-block-end: 8px;
}

.sc-fortify-page__head h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: var(--md-typescale-headline-small-weight);
}

/* 与 PackWorkbench 内的卡片同一套视觉 */
.sc-fcard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: var(--md-sys-shape-corner-large);
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.sc-fcard__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--md-typescale-title-medium-weight);
}

/* 使用须知：四块说明，窄屏自动收成单列 */
.sc-fortify-page__notes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.sc-fortify-page__note {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sc-fortify-page__note h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: var(--md-typescale-title-small-weight);
}

.sc-fortify-page__note ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-inline-start: 18px;
}

.sc-fortify-page__note code {
  padding: 1px 6px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  font-size: 0.9em;
}

.sc-fortify-page__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-fortify-page__select {
  width: 100%;
  max-width: 480px;
  padding: 10px 14px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}
</style>
