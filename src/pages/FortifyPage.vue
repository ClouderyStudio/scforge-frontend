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
  IconScience,
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
            <li>防二改：改内容、换皮、改包名版本——凡是在<strong>原包上动手脚</strong>，验签当场识破。</li>
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
            <li>诚实边界：拆包提取在密码学上<strong>拦不住</strong>（密钥凭包内编号就能向服务器领取，这是所有"客户端解密"方案的共同属性）；壳本身运行在玩家机器上，也可能被替换。防的是<strong>冒名改包</strong>与服务端作废，不是防搬运——详见下方「原理」。</li>
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

    <!-- 原理介绍：默认折叠，想深究的作者点开看 -->
    <details class="sc-fcard sc-fortify-page__how">
      <summary class="sc-fcard__title md-typescale-title-medium">
        <M3Icon :icon="IconScience" :size="20" />
        原理：它是怎么工作的？破解有多难？
      </summary>

      <ol class="sc-fortify-page__steps md-typescale-body-medium">
        <li>
          <strong>打包（在你的浏览器里）</strong> ——
          先生成一把一次性的「内容密钥」，把整个 mod 锁进保险箱（AES-256-GCM 加密）；
          再用你的「签名私钥」给包裹盖上<strong>防伪章</strong>（ECDSA 签名）——
          包名、版本号一起盖进章里，事后改不掉。
        </li>
        <li>
          <strong>登记（发给 scforge 服务器）</strong> ——
          内容密钥本身再被服务器的主密钥<strong>包一层</strong>（信封加密）后存进服务器；
          加固包里只留一个「取件编号」（keyId）。密钥从不以明文出现在包里。
        </li>
        <li>
          <strong>加载（玩家的游戏里）</strong> ——
          壳先验防伪章（签名 + 整个 modinfo 的指纹比对），章完好才拿编号联网取密钥，
          在内存里解开后才交给游戏。任何一步对不上 → 直接拒绝加载。
        </li>
      </ol>

      <h3 class="md-typescale-title-small sc-fortify-page__how-sub">想破解？每一关都是硬骨头</h3>
      <ul class="md-typescale-body-medium sc-fortify-page__cracks">
        <li>
          <strong>暴力试密钥 —— 试不动。</strong>
          AES-256 有 2 的 256 次方种密钥，把全世界的电脑都开动，算到宇宙热寂也试不完。
        </li>
        <li>
          <strong>改包绕过验签 —— 盖不出章。</strong>
          没有私钥就造不出合法签名；改一个字节、哪怕只改包名版本号，验签当场识破。
        </li>
        <li>
          <strong>拆包提取明文 —— 能做，但换不来身份。</strong>
          密钥凭包内编号就能向服务器领取（服务器无法区分"合法壳"和"拿着包的攻击者"，
          这是所有客户端解密方案的固有属性，我们不假装密钥是保密的）。
          但拿到的是明文内容，不是作者的签名私钥：在原包上改过的东西永远盖不出原作者的章，
          服务端也能随时作废这把钥匙让整包变砖。
        </li>
        <li>
          <strong>偷服务器数据库 —— 偷到的还是密文。</strong>
          密钥在库里是信封加密存的，主密钥另存；光拖库拿不到任何一把明文密钥。
        </li>
        <li>
          <strong>自建假服务器骗密钥 —— 地址改不了。</strong>
          取密钥的服务器地址钉死在包里、且被签名覆盖，改地址 = 先毁自己的章。
          取密钥全程 HTTPS，壳不关证书校验（明文 http 需打包时显式声明，壳会拒绝）。
        </li>
        <li>
          <strong>内存转储与替换壳 —— 现实中的口子。</strong>
          mod 载入内存的那一刻总有明文；壳运行在玩家机器上，验签与解密逻辑本身也可能被
          patch 或替换——壳自身的完整性不在防护承诺内。如实说：本工具防的是
          「随手改与冒名」，不承诺对抗内存级与本地篡改攻击。
        </li>
        <li>
          <strong>管理兜底 —— 技术之外还有制度。</strong>
          就算有人绕过以上全部，管理方复核后仍可查看登记密钥的明文，直接开箱检查包内容。
        </li>
      </ul>
    </details>

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

/* 原理介绍（details 折叠卡） */
.sc-fortify-page__how summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.sc-fortify-page__how summary::-webkit-details-marker {
  display: none;
}

.sc-fortify-page__how summary::after {
  content: '展开 ▾';
  margin-inline-start: auto;
  color: var(--md-sys-color-primary);
  font-size: var(--md-typescale-label-large-size);
}

.sc-fortify-page__how[open] summary::after {
  content: '收起 ▴';
}

.sc-fortify-page__steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding-inline-start: 20px;
}

.sc-fortify-page__steps li::marker {
  color: var(--md-sys-color-primary);
  font-weight: var(--md-typescale-title-small-weight);
}

.sc-fortify-page__how-sub {
  margin-block-start: 4px;
  font-weight: var(--md-typescale-title-small-weight);
}

.sc-fortify-page__cracks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding-inline-start: 20px;
}

.sc-fortify-page__cracks li::marker {
  color: var(--md-sys-color-primary);
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
