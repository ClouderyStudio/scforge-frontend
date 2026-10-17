<script setup lang="ts">
/**
 * 网页打包工作卡（ModFortify）：加密与签名**全部在浏览器里完成**。
 *
 * 私钥只在内存里（可下载保存），明文 mod 不上传 —— 服务器只参与两件事：
 * 下发 ModShell.dll、接收登记（此时已是密文 + 信封加密）。
 *
 * `pluginId` 为空时只打包下载、不登记（独立工作台里由外层负责选资源后传入）；
 * 传入时打包成功即自动登记该资源的加固密钥。
 * 私钥丢了可重新生成并登记新 keyId：旧包不受影响（它们内嵌的是旧公钥），
 * 所以刻意不做 localStorage 持久化，宁可让作者保存文件。
 */
import { computed, ref, watch } from 'vue'
import { IconDownload, IconFolderZip, IconKey, IconVerified } from '@/icons'
import { M3Button, M3Icon } from '@/components/m3'
import FileDrop from '@/components/ui/FileDrop.vue'
import { fortifyApi } from '@/api/fortify'
import { apiUrl } from '@/api/http'
import { useSnackbar } from '@/composables/useSnackbar'
import {
  type AuthorKey,
  FORTIFY_SERVICE_HOST,
  generateAuthorKey,
  importAuthorKeyPkcs8,
  looksLikeFortified,
  packNetmod,
  pemToDer,
  pkcs8ToPem,
  readZipEntryBytes,
  spkiToPem,
} from '@/utils/mfortifyPack'

const props = defineProps<{ pluginId: string | null }>()

const emit = defineEmits<{ (e: 'registered'): void }>()

const snackbar = useSnackbar()

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
    // 先拒绝二次加固：对加固包再套壳会让两层壳同时剥开（密钥登记翻倍），
    // 且攻击者可借嵌套把别人的加固包套上自己的签名身份（洗白作者）。
    if (await looksLikeFortified(bytes)) {
      throw new Error('这个包已经是加固包，不能再次加固 —— 请用原始未加固的 netmod')
    }
    const modinfo = await readZipEntryBytes(bytes, 'modinfo.json')
    if (!modinfo) throw new Error(`${file.name} 里没有 modinfo.json —— 它应该是一个原始的 netmod`)
    const text = decodeUtf8(modinfo)
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

function decodeUtf8(b: Uint8Array): string {
  const off = b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 3 : 0
  return new TextDecoder('utf-8').decode(b.slice(off))
}

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

async function packAndRegister(): Promise<void> {
  if (!plainBytes.value || !modinfoBytes.value || !webKey.value || !plainInfo.value) return
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

    // ③ 登记密钥（传入了目标资源才登记；独立工作台由外层选资源）
    if (props.pluginId) {
      await fortifyApi.register(props.pluginId, {
        keyId: out.keyId,
        packageName: out.packageName,
        version: out.version,
        key: out.key,
        authorPublicKey: out.authorPublicKey,
        authorKeyFingerprint: out.authorKeyFingerprint,
      })
    }

    // ④ 下载加固包与密钥存档
    downloadBytes(`${plainInfo.value.packageName}-加固.netmod`, out.netmod)
    downloadText(`${plainInfo.value.packageName}-加固.netmod.secret.json`, out.secretJson)

    snackbar.show(
      props.pluginId
        ? '已打包并登记：加固 netmod 与密钥存档已开始下载，请把加固包上传到「版本管理」'
        : '已打包：加固 netmod 与密钥存档已开始下载',
    )
    if (props.pluginId) emit('registered')
  } catch (error) {
    snackbar.error(error instanceof Error ? error.message : '打包失败')
  } finally {
    packing.value = false
  }
}
</script>

<template>
  <section class="sc-fcard">
    <h2 class="sc-fcard__title md-typescale-title-medium">
      <M3Icon :icon="IconFolderZip" :size="20" />
      网页打包
    </h2>
    <p class="md-typescale-body-small sc-muted">
      拖入原始 netmod，<strong>加密与签名全部在你浏览器里完成</strong> ——
      私钥不离开你的电脑，明文 mod 也不上传服务器。
      <template v-if="pluginId">完成后自动登记密钥，并下载加固包（再把它上传到「版本管理」即可）。</template>
      <template v-else>选中上方资源后，完成后会自动登记到该资源。</template>
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
</template>

<style scoped>
/* 卡片视觉与编辑页的 sc-form-card 一致；两处各自 scoped，样式刻意保持相同。 */
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

.sc-fortify__ok {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-primary);
}

.sc-ffield__label {
  font-weight: var(--md-typescale-label-large-weight);
}
</style>
