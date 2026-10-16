<script setup lang="ts">
/**
 * 加固密钥管理（ModFortify）。
 *
 * 作者的本机流程是：`modpack keygen` → `pack`（产出加固 netmod + *.secret.json）→
 * 把加固包当版本文件上传。这个面板负责中间那步「登记」：作者拖两个文件进来，
 * 网页自动把 secret.json 的 keyId/包名/版本/密钥、netmod 里 author.pub 的公钥与指纹
 * 填进表单，交给服务端信封加密落库 —— 之后客户端壳就能按 keyId 三元取到密钥。
 *
 * 「登记」**不会碰任何已有密钥**：每个已发布版本的密钥继续生效，玩家手里的旧包不受影响。
 * 作废是显式的管理动作 —— 只在列表里点「作废」，且立刻生效、不可通过重新登记恢复。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { IconDelete, IconDownload, IconFolderZip, IconKey, IconShield, IconVerified, IconWarning } from '@/icons'
import { M3Button, M3Dialog, M3Icon, M3IconButton, M3Tooltip } from '@/components/m3'
import FileDrop from '@/components/ui/FileDrop.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { fortifyApi } from '@/api/fortify'
import { apiUrl } from '@/api/http'
import type { FortifyKeyRecord, PluginDetail } from '@/api/types'
import { useSnackbar } from '@/composables/useSnackbar'
import { parseSecretFile, readAuthorPub, readNetmodEntry } from '@/utils/fortifyFiles'
import { formatDateTime } from '@/utils/format'
import {
  type AuthorKey,
  FORTIFY_SERVICE_HOST,
  generateAuthorKey,
  importAuthorKeyPkcs8,
  packNetmod,
  pemToDer,
  pkcs8ToPem,
  spkiToPem,
} from '@/utils/mfortifyPack'

const props = defineProps<{ plugin: PluginDetail | null }>()

const snackbar = useSnackbar()

const keys = ref<FortifyKeyRecord[]>([])
const loading = ref(true)
const registering = ref(false)

/** 两个拖放位：secret.json 提供身份与密钥，加固 netmod 提供公钥与指纹。 */
const secretFile = ref<File | null>(null)
const netmodFile = ref<File | null>(null)
const parseError = ref('')

const form = ref({
  keyId: '',
  packageName: '',
  version: '',
  key: '',
  authorPublicKey: '',
  authorKeyFingerprint: '',
})

/** 密钥与公钥不在界面上整串展示（拖放进来就说明作者手里有原件），只给个可辨认的摘要。 */
const keyPreview = computed(() => (form.value.key ? form.value.key.slice(0, 12) + '…' : ''))
const fingerprintPreview = computed(() =>
  form.value.authorKeyFingerprint ? form.value.authorKeyFingerprint.slice(0, 16) + '…' : '',
)

const canSubmit = computed(
  () =>
    !registering.value &&
    form.value.keyId.length === 32 &&
    form.value.packageName.length > 0 &&
    form.value.version.length > 0 &&
    form.value.key.length > 0 &&
    form.value.authorPublicKey.length > 0 &&
    form.value.authorKeyFingerprint.length === 64,
)

/** 作废确认框（复用编辑页「删除版本」的同款模式：可读写的布尔给 v-model）。 */
const revokeTarget = ref<FortifyKeyRecord | null>(null)
const revoking = ref(false)
const confirmRevoke = computed({
  get: () => revokeTarget.value !== null,
  set: (value: boolean) => {
    if (!value) revokeTarget.value = null
  },
})

async function load(): Promise<void> {
  const id = props.plugin?.id
  if (!id) return
  loading.value = true
  try {
    keys.value = (await fortifyApi.list(id)).items
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '读取加固密钥失败')
  } finally {
    loading.value = false
  }
}

/* ---------------- 网页打包（推荐路径） ---------------- */
/**
 * 加密与签名**全部在浏览器里完成**：私钥只在内存里（可下载保存），明文 mod 不上传 ——
 * 服务器只参与两件事：下发 ModShell.dll、接收登记（此时已是密文 + 信封加密）。
 * 私钥丢了可以重新生成并登记新 keyId：旧包不受影响（它们内嵌的是旧公钥），
 * 新包用新身份 —— 所以这里不做 localStorage 持久化，宁可让作者保存文件。
 */
const plainFile = ref<File | null>(null)
const plainInfo = ref<{ packageName: string; version: string } | null>(null)
const webKey = ref<AuthorKey | null>(null)
const keySource = ref('')
const packing = ref(false)

const plainBytes = ref<Uint8Array<ArrayBuffer> | null>(null)
const modinfoBytes = ref<Uint8Array<ArrayBuffer> | null>(null)
const sourceName = ref('')

const canWebPack = computed(() => !!(plainBytes.value && modinfoBytes.value && webKey.value) && !packing.value)

watch(plainFile, async (file) => {
  plainInfo.value = null
  plainBytes.value = null
  modinfoBytes.value = null
  if (!file) return
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const modinfo = await readNetmodEntry(file, 'modinfo.json')
    if (!modinfo) throw new Error(`${file.name} 里没有 modinfo.json —— 它应该是一个原始的 netmod`)
    const text = new TextDecoder('utf-8').decode(
      modinfo.length >= 3 && modinfo[0] === 0xef && modinfo[1] === 0xbb && modinfo[2] === 0xbf
        ? modinfo.slice(3)
        : modinfo,
    )
    const parsed = JSON.parse(text) as { PackageName?: string; Version?: string }
    if (!parsed.PackageName) throw new Error('modinfo.json 里没有 PackageName')
    plainBytes.value = bytes
    modinfoBytes.value = modinfo
    sourceName.value = file.name
    plainInfo.value = { packageName: parsed.PackageName, version: parsed.Version ?? '' }
  } catch (error) {
    plainFile.value = null
    snackbar.error(error instanceof Error ? error.message : String(error))
  }
})

async function generateKeyHere(): Promise<void> {
  try {
    webKey.value = await generateAuthorKey()
    keySource.value = '本次生成'
    // 私钥只此一份 —— 不下载保存的话，关掉页面就再也签不出同一身份的包了。
    downloadText('作者签名密钥.key.pem', pkcs8ToPem(webKey.value.privateKeyPkcs8))
    downloadText('作者签名公钥.pub.pem', spkiToPem(webKey.value.publicKeySpki))
    snackbar.show('已生成签名密钥，.key.pem 与 .pub.pem 已开始下载 —— 请妥善保存私钥')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '生成密钥失败')
  }
}

function downloadText(name: string, text: string): void {
  downloadBytes(name, new TextEncoder().encode(text))
}

function downloadBytes(name: string, data: Uint8Array): void {
  const blob = new Blob([data.slice().buffer as ArrayBuffer])
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

async function importKeyPem(file: File): Promise<void> {
  try {
    webKey.value = await importAuthorKeyPkcs8(pemToDer(await file.text()))
    keySource.value = file.name
    snackbar.show('已导入签名私钥')
  } catch (error) {
    webKey.value = null
    snackbar.error(error instanceof Error ? error.message : '私钥导入失败（应为 PKCS#8 的 .key.pem）')
  }
}

async function packAndRegister(): Promise<void> {
  const id = props.plugin?.id
  if (!id || !plainBytes.value || !modinfoBytes.value || !webKey.value || !plainInfo.value) return
  packing.value = true
  try {
    // ① 取当前版本的壳（服务端随部署统一维护）
    const resp = await fetch(apiUrl('/scforge/fortify/shell'), { credentials: 'include' })
    if (!resp.ok) throw new Error(`取 ModShell.dll 失败（HTTP ${resp.status}）`)
    const shellDll = new Uint8Array(await resp.arrayBuffer())

    // ② 浏览器内加密 + 签名（私钥与明文都不出本机）
    const out = await packNetmod({
      plain: plainBytes.value,
      modinfoBytes: modinfoBytes.value,
      sourceName: sourceName.value,
      packageName: plainInfo.value.packageName,
      version: plainInfo.value.version,
      shellDll,
      authorKey: webKey.value,
    })

    // ③ 登记密钥（信封加密落库，客户端壳才能取到）
    await fortifyApi.register(id, {
      keyId: out.keyId,
      packageName: out.packageName,
      version: out.version,
      key: out.key,
      authorPublicKey: out.authorPublicKey,
      authorKeyFingerprint: out.authorKeyFingerprint,
    })

    // ④ 下载加固包与密钥存档
    downloadBytes(`${plainInfo.value.packageName}-加固.netmod`, out.netmod)
    downloadText(`${plainInfo.value.packageName}-加固.netmod.secret.json`, out.secretJson)

    snackbar.show('已打包并登记：加固 netmod 与密钥存档已开始下载，请把加固包上传到「版本管理」')
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '打包失败')
  } finally {
    packing.value = false
  }
}

/* secret.json → 身份四件套。文件一换就重填，别的字段（公钥）保持不动。 */
watch(secretFile, async (file) => {
  if (!file) return
  parseError.value = ''
  try {
    const secret = await parseSecretFile(file)
    form.value.keyId = secret.keyId
    form.value.packageName = secret.packageName
    form.value.version = secret.version
    form.value.key = secret.key
  } catch (error) {
    secretFile.value = null
    parseError.value = error instanceof Error ? error.message : String(error)
  }
})

/* 加固 netmod → author.pub（SPKI/DER）+ 指纹。 */
watch(netmodFile, async (file) => {
  if (!file) return
  parseError.value = ''
  try {
    const pub = await readAuthorPub(file)
    form.value.authorPublicKey = pub.authorPublicKey
    form.value.authorKeyFingerprint = pub.authorKeyFingerprint
  } catch (error) {
    netmodFile.value = null
    parseError.value = error instanceof Error ? error.message : String(error)
  }
})

async function register(): Promise<void> {
  const id = props.plugin?.id
  if (!id) return
  registering.value = true
  try {
    const result = await fortifyApi.register(id, { ...form.value })
    snackbar.show(result.notice)
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '登记失败')
  } finally {
    registering.value = false
  }
}

async function revoke(): Promise<void> {
  const id = props.plugin?.id
  const target = revokeTarget.value
  if (!id || !target) return
  revoking.value = true
  try {
    await fortifyApi.revoke(id, target.id)
    snackbar.show('已作废 —— 客户端从此取不到这把密钥')
    await load()
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '作废失败')
  } finally {
    revoking.value = false
    revokeTarget.value = null
  }
}

/* tab 是 v-if/v-else 链，只在切到本页时才挂载 —— 那时父页的 plugin 早已就绪。 */
onMounted(() => void load())
</script>

<template>
  <div class="sc-fortify">
    <!-- ---------------- 这是干什么的 ---------------- -->
    <section class="sc-fcard">
      <h2 class="sc-fcard__title md-typescale-title-medium">
        <M3Icon :icon="IconShield" :size="20" />
        加固
      </h2>
      <p class="md-typescale-body-small sc-muted">
        把模组包加密 + 用你的私钥签名，玩家改过一个字节都加载不了。两条路任选：
        <b>网页打包</b>（下方第一张卡，浏览器内完成加密签名，登记自动完成）；
        或<b>本机 CLI</b>：<code>keygen</code> / <code>pack</code> 产出加固 netmod 与
        <code>*.secret.json</code> → 拖入第二张卡登记 → 把加固 netmod 当版本文件上传（「版本管理」）。
      </p>
      <p class="md-typescale-body-small sc-muted">
        密钥明文只在这里登记一次，服务端按信封加密保存；网页上任何时候都看不到整串密钥。
      </p>
    </section>

    <!-- ---------------- 网页打包（推荐路径） ---------------- -->
    <section class="sc-fcard">
      <h2 class="sc-fcard__title md-typescale-title-medium">
        <M3Icon :icon="IconFolderZip" :size="20" />
        网页打包
      </h2>
      <p class="md-typescale-body-small sc-muted">
        拖入原始 netmod，<strong>加密与签名全部在你浏览器里完成</strong> ——
        私钥不离开你的电脑，明文 mod 也不上传服务器。
        完成后自动登记密钥，并下载加固包（再把它上传到「版本管理」即可）。
      </p>

      <div class="sc-fortify__drops">
        <FileDrop
          v-model="plainFile"
          accept=".netmod,.zip"
          label="① 原始 netmod（未加固）"
          hint="本地加密用，不会上传"
          :max-bytes="256 * 1024 * 1024"
        />
        <div class="sc-fortify__keyside">
          <span class="sc-ffield__label md-typescale-label-large">② 作者签名私钥</span>
          <div class="sc-fortify__keybtns">
            <M3Button variant="tonal" :icon="IconKey" @click="generateKeyHere">生成新密钥</M3Button>
          </div>
          <FileDrop
            :model-value="null"
            accept=".pem,.key,.txt"
            label="或拖入已有 .key.pem"
            hint="CLI 生成的密钥文件可直接使用"
            :max-bytes="64 * 1024"
            @update:model-value="(f) => (f ? void importKeyPem(f) : undefined)"
          />
          <p v-if="webKey" class="md-typescale-body-small sc-fortify__ok">
            <M3Icon :icon="IconVerified" :size="16" />
            私钥就绪（{{ keySource }}）· 指纹 {{ webKey.fingerprintHex.slice(0, 16) }}…
          </p>
          <p v-else class="md-typescale-body-small sc-muted">
            生成或导入后请把下载的 .key.pem 保存好；丢失可重新生成（旧包不受影响）。
          </p>
        </div>
      </div>

      <p v-if="plainInfo" class="md-typescale-body-small sc-muted">
        识别为 <b>{{ plainInfo.packageName }}</b> {{ plainInfo.version }} ·
        服务 <code>{{ FORTIFY_SERVICE_HOST }}</code>
      </p>

      <div>
        <M3Button
          variant="filled"
          :icon="IconDownload"
          :disabled="!canWebPack"
          @click="packAndRegister"
        >
          {{ packing ? '打包中…' : '加密并下载' }}
        </M3Button>
      </div>
    </section>

    <!-- ---------------- 登记密钥（CLI 产出） ---------------- -->
    <section class="sc-fcard">
      <h2 class="sc-fcard__title md-typescale-title-medium">
        <M3Icon :icon="IconKey" :size="20" />
        登记密钥
      </h2>

      <div class="sc-fortify__drops">
        <FileDrop
          v-model="secretFile"
          accept=".json,application/json"
          label="① pack 产出的 *.secret.json"
          hint="提供 keyId、包名、版本与 AES 密钥"
          :max-bytes="64 * 1024"
        />
        <FileDrop
          v-model="netmodFile"
          accept=".netmod,.zip"
          label="② 加固后的 netmod"
          hint="用来读出 author.pub（你的签名公钥）并计算指纹"
          :max-bytes="256 * 1024 * 1024"
        />
      </div>

      <p v-if="parseError" class="md-typescale-body-small sc-fortify__error">
        <M3Icon :icon="IconWarning" :size="16" />
        {{ parseError }}
      </p>

      <div class="sc-fortify__grid">
        <div class="sc-ffield">
          <span class="sc-ffield__label md-typescale-label-large">keyId</span>
          <input
            v-model="form.keyId"
            class="sc-finput md-typescale-body-medium"
            maxlength="32"
            placeholder="32 位十六进制"
            spellcheck="false"
          />
        </div>
        <div class="sc-ffield">
          <span class="sc-ffield__label md-typescale-label-large">包名（PackageName）</span>
          <input v-model="form.packageName" class="sc-finput md-typescale-body-medium" spellcheck="false" />
        </div>
        <div class="sc-ffield">
          <span class="sc-ffield__label md-typescale-label-large">版本</span>
          <input v-model="form.version" class="sc-finput md-typescale-body-medium" spellcheck="false" />
        </div>
        <div class="sc-ffield">
          <span class="sc-ffield__label md-typescale-label-large">AES 密钥</span>
          <input
            v-model="form.key"
            class="sc-finput md-typescale-body-medium"
            placeholder="base64 的 32 字节"
            spellcheck="false"
          />
          <span v-if="keyPreview" class="md-typescale-body-small sc-muted">{{ keyPreview }}</span>
        </div>
        <div class="sc-ffield sc-ffield--wide">
          <span class="sc-ffield__label md-typescale-label-large">签名公钥指纹</span>
          <input
            v-model="form.authorKeyFingerprint"
            class="sc-finput md-typescale-body-medium"
            maxlength="64"
            placeholder="64 位十六进制（SHA-256 of author.pub）"
            spellcheck="false"
          />
          <span v-if="fingerprintPreview" class="md-typescale-body-small sc-muted">
            {{ fingerprintPreview }}
          </span>
        </div>
      </div>

      <p class="md-typescale-body-small sc-muted">
        登记<strong>不影响已有的其它密钥</strong> —— 每个已发布版本的密钥继续生效，玩家手里的旧包照常能用。
        发新版本时用新 keyId 打包再登记即可；要停用某把密钥，在下方列表里显式作废。
      </p>

      <div>
        <M3Button variant="filled" :icon="IconVerified" :disabled="!canSubmit" @click="register">
          {{ registering ? '登记中…' : '登记密钥' }}
        </M3Button>
      </div>
    </section>

    <!-- ---------------- 密钥列表 ---------------- -->
    <section class="sc-fcard">
      <h2 class="sc-fcard__title md-typescale-title-medium">
        <M3Icon :icon="IconKey" :size="20" />
        已登记的密钥
      </h2>

      <p v-if="loading" class="md-typescale-body-small sc-muted">读取中…</p>
      <template v-else>
        <ul v-if="keys.length" class="sc-fortify__list">
          <li v-for="item in keys" :key="item.id" class="sc-fortify__item" :class="{ 'sc-fortify__item--off': !item.active }">
            <span class="sc-fortify__dot" :class="item.active ? 'is-active' : 'is-revoked'" />
            <div class="sc-fortify__meta">
              <span class="sc-fortify__keyid md-typescale-body-medium">{{ item.keyId.slice(0, 12) }}…</span>
              <span class="md-typescale-body-small sc-muted">
                {{ item.packageName }} · {{ item.version }} ·
                指纹 {{ item.authorKeyFingerprint.slice(0, 12) }}… ·
                {{ formatDateTime(item.createdAt) }}
                <template v-if="!item.active"> · {{ formatDateTime(item.revokedAt) }} 已作废</template>
              </span>
            </div>
            <M3Tooltip v-if="item.active" text="作废后客户端立刻取不到这把密钥">
              <M3IconButton
                :icon="IconDelete"
                size="sm"
                :label="`作废 ${item.keyId.slice(0, 8)}…`"
                @click="revokeTarget = item"
              />
            </M3Tooltip>
          </li>
        </ul>
        <EmptyState v-else title="还没有登记过密钥">
          先在本机用 ModFortify 打包，再把两个文件拖到上面完成登记。
        </EmptyState>
      </template>
    </section>

    <!-- ---------------- 作废确认 ---------------- -->
    <M3Dialog v-model="confirmRevoke" title="作废这把加固密钥？">
      <template v-if="revokeTarget">
        作废后<strong>立刻生效且不可恢复</strong>：客户端壳再也取不到这把密钥，用它签的旧包会加载失败。
        密钥泄漏就必须作废；如果只是要发新版本，<b>不需要动它</b> —— 直接用新 keyId 打包登记即可，旧包照常可用。
      </template>
      <template #actions>
        <M3Button variant="text" @click="revokeTarget = null">取消</M3Button>
        <M3Button variant="filled" :disabled="revoking" @click="revoke">作废</M3Button>
      </template>
    </M3Dialog>
  </div>
</template>

<style scoped>
/* 卡片视觉与编辑页的 sc-form-card 一致，但那是页面内 scoped 样式，这里自带一份。 */
.sc-fortify {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.sc-fcard code {
  padding: 1px 6px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  font-size: 0.9em;
}

.sc-fortify__drops {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.sc-fortify__error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-error);
}

.sc-fortify__ok {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-primary);
}

.sc-fortify__keyside {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sc-fortify__keybtns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sc-fortify__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.sc-ffield {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sc-ffield--wide {
  grid-column: 1 / -1;
}

.sc-ffield__label {
  font-weight: var(--md-typescale-label-large-weight);
}

.sc-finput {
  width: 100%;
  min-width: 0;
  padding: 10px 14px;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.sc-finput:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 1px;
}

.sc-fortify__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sc-fortify__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
}

.sc-fortify__item--off {
  opacity: 0.55;
}

.sc-fortify__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.sc-fortify__dot.is-active {
  background-color: var(--md-sys-color-primary);
}

.sc-fortify__dot.is-revoked {
  background-color: var(--md-sys-color-outline);
}

.sc-fortify__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sc-fortify__keyid {
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
}
</style>
