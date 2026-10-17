/**
 * ModFortify 打包的**浏览器端实现** —— 与 sc-plugins 仓库的 `ModFortify.Core.cs` 逐字段同构。
 *
 * 设计立场：加密与签名**全部在作者浏览器里完成** —— 私钥不离开作者电脑，
 * 明文 mod 不上传服务器。服务端只提供 ModShell.dll 的下发（GET /scforge/fortify/shell）
 * 与密钥登记（既有 /scforge/fortify/keys）。
 *
 * 与 .NET 侧的兼容性依据（都核对过源码）：
 *   - 签名：ECDSA P-256 + SHA-256，**P1363 定长 64 字节** —— WebCrypto 的 ECDSA 原生输出同格式；
 *     密钥 PKCS#8（私）/ SPKI（公）与 `exportKey` 同格式 ⇒ 与 CLI 的 .key.pem 可互换。
 *   - 加密：AES-256-GCM，12 字节 nonce，AAD = **整个头部**，body = **密文‖tag** ——
 *     与 `crypto.subtle.encrypt` 的输出顺序一致。
 *   - 整数全是小端（.NET 侧 Buf 手写 LE）；magic 是 ASCII "MFORT1"，版本 2。
 *
 * 本文件刻意只用 WebCrypto + 标准内置对象、不用任何 import —— 这样它可以在 Node
 * （type-stripping）下直接跑，用于与 C# CLI 做跨实现验证。
 */

/* ----------------------------- 常量（对齐 Mfx） ----------------------------- */

const MAGIC = 'MFORT1'
const FORMAT_VERSION = 2
const CIPHER_AES256GCM = 1
const SIG_ECDSA_P256 = 1
const FLAG_SIGNED = 0x01
const KEY_ID_LEN = 16
const KEY_LEN = 32
const NONCE_LEN = 12
const TAG_LEN = 16

/** 游戏客户端取密钥的服务主机（锚点，2026-10-16 定稿；换后端靠 DNS/反代，此值不动）。 */
export const FORTIFY_SERVICE_HOST = 'api.cldery.com'

/* ------------------------------- 小端缓冲写入 ------------------------------- */

class BufWriter {
  private readonly chunks: number[] = []

  u8(v: number): void {
    this.chunks.push(v & 0xff)
  }

  u16(v: number): void {
    this.chunks.push(v & 0xff, (v >> 8) & 0xff)
  }

  u64(v: number): void {
    for (let i = 0; i < 8; i++) this.chunks.push(Math.floor(v / 2 ** (8 * i)) & 0xff)
  }

  bytes(b: Uint8Array): void {
    for (const x of b) this.chunks.push(x & 0xff)
  }

  str(s: string): void {
    const b = new TextEncoder().encode(s)
    this.u16(b.length)
    this.bytes(b)
  }

  toArray(): Uint8Array<ArrayBuffer> {
    // number[] 构造出的缓冲区是独占 ArrayBuffer（TS 的重载推断给成宽泛类型，这里显式收紧）。
    return new Uint8Array(this.chunks) as Uint8Array<ArrayBuffer>
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const x of bytes) binary += String.fromCharCode(x)
  return btoa(binary)
}

/** 只在 Node 验证脚本里用到；浏览器走 crypto.getRandomValues 也一样。 */
function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n))
}

/* ------------------------------ 作者签名密钥 ------------------------------ */

export interface AuthorKey {
  /** 可直接 subtle.sign 的私钥句柄。 */
  privateKey: CryptoKey
  /** PKCS#8 DER —— 下载保存成 .key.pem 后可与 CLI 互换使用。 */
  privateKeyPkcs8: Uint8Array<ArrayBuffer>
  /** SPKI DER —— 即 netmod 里 author.pub 条目的内容。 */
  publicKeySpki: Uint8Array<ArrayBuffer>
  /** 指纹：SHA-256(SPKI) 十六进制（64 字符），登记接口要的就是它。 */
  fingerprintHex: string
}

/** 在浏览器里生成一对新的作者签名密钥（P-256）。 */
export async function generateAuthorKey(): Promise<AuthorKey> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
  const privateKeyPkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const publicKeySpki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey))
  const fingerprintHex = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', publicKeySpki)))
  return { privateKey: pair.privateKey, privateKeyPkcs8, publicKeySpki, fingerprintHex }
}

/** 导入 PKCS#8 DER 私钥（作者拖入 CLI 生成的 .key.pem 时走这里）。 */
export async function importAuthorKeyPkcs8(der: Uint8Array<ArrayBuffer>): Promise<AuthorKey> {
  // extractable 必须为 true：下面要从私钥推导出公钥（exportKey jwk）。
  // 这里"可导出"不构成额外泄露 —— 私钥本来就完整存在于作者的 .key.pem 文件里。
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    der as BufferSource,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  )
  // 公钥从私钥推导：临时再导入成可导出句柄拿 SPKI。
  const pubJwk = (await crypto.subtle.exportKey('jwk', privateKey)) as JsonWebKey
  delete pubJwk.d
  pubJwk.key_ops = ['verify']
  const publicKey = await crypto.subtle.importKey('jwk', pubJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, [])
  const publicKeySpki = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey))
  const fingerprintHex = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', publicKeySpki)))
  return { privateKey, privateKeyPkcs8: der, publicKeySpki, fingerprintHex }
}

/** 从 PEM 文本（-----BEGIN PRIVATE KEY-----）取 PKCS#8 DER。 */
export function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('-----'))
    .join('')
  const binary = atob(body)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/** SPKI DER → PEM 文本（给作者保存 / 交给 verify-dir）。 */
export function spkiToPem(spki: Uint8Array): string {
  const b64 = toBase64(spki)
  const lines = b64.match(/.{1,64}/g) ?? []
  return '-----BEGIN PUBLIC KEY-----\n' + lines.join('\n') + '\n-----END PUBLIC KEY-----\n'
}

/** PKCS#8 DER → PEM 文本（下载保存成 .key.pem）。 */
export function pkcs8ToPem(pkcs8: Uint8Array): string {
  const b64 = toBase64(pkcs8)
  const lines = b64.match(/.{1,64}/g) ?? []
  return '-----BEGIN PRIVATE KEY-----\n' + lines.join('\n') + '\n-----END PRIVATE KEY-----\n'
}

/* -------------------------------- 载荷打包 -------------------------------- */

export interface PackResult {
  /** MFORT2 载荷字节（放进 netmod 的 payload.bin 条目）。 */
  payload: Uint8Array<ArrayBuffer>
  keyIdHex: string
  keyBase64: string
  authorPubBase64: string
  fingerprintHex: string
}

/**
 * 加密 + 签名一个原始 mod 包，产出 payload.bin 的字节。
 * 与 `ModFortifyCore.Build` 的 MFORT2 布局逐字段一致。
 */
export async function packPayload(options: {
  /** 原始 netmod 的完整字节（明文）。 */
  plain: Uint8Array<ArrayBuffer>
  /** 外层 modinfo.json 的字节（v2 会把它整份签进头部）。 */
  modinfoBytes: Uint8Array<ArrayBuffer>
  /** 包名 / 版本：写进签名头部，壳会用它们核对外层 modinfo.json。 */
  packageName: string
  version: string
  /** 要导入的原始文件名（modfortify.json 里记录用）。 */
  sourceName: string
  aesKey: Uint8Array<ArrayBuffer>
  keyId: Uint8Array<ArrayBuffer>
  privateKey: CryptoKey
  authorPubSpki: Uint8Array<ArrayBuffer>
  serviceHost: string
}): Promise<PackResult> {
  if (options.aesKey.length !== KEY_LEN) throw new Error('AES 密钥必须是 32 字节')
  if (options.keyId.length !== KEY_ID_LEN) throw new Error('keyId 必须是 16 字节')

  const plainSha = new Uint8Array(await crypto.subtle.digest('SHA-256', options.plain))
  const metaSha = new Uint8Array(await crypto.subtle.digest('SHA-256', options.modinfoBytes))
  const nonce = randomBytes(NONCE_LEN)

  // 头部：与 Buf 的写入顺序逐字段一致（小端）。
  const h = new BufWriter()
  for (const ch of MAGIC) h.u8(ch.charCodeAt(0))
  h.u8(FORMAT_VERSION)
  h.u8(FLAG_SIGNED)
  h.u8(CIPHER_AES256GCM)
  h.u8(SIG_ECDSA_P256)
  h.bytes(options.keyId)
  h.str(options.packageName)
  h.str(options.version)
  h.str(options.serviceHost)
  h.bytes(metaSha)
  h.bytes(plainSha)
  h.bytes(nonce)
  h.u64(options.plain.length + TAG_LEN)
  const header = h.toArray()

  // subtle.encrypt 返回 密文‖tag —— 与 body 布局一致，AAD 是整个头部。
  const aes = await crypto.subtle.importKey('raw', options.aesKey as BufferSource, 'AES-GCM', false, ['encrypt'])
  const body = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce as BufferSource, additionalData: header as BufferSource, tagLength: 128 },
      aes,
      options.plain as BufferSource,
    ),
  )

  const signedPart = concat(header, body)
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, options.privateKey, signedPart as BufferSource),
  )

  const o = new BufWriter()
  o.bytes(header)
  o.bytes(body)
  o.u16(sig.length)
  o.bytes(sig)

  return {
    payload: o.toArray(),
    keyIdHex: toHex(options.keyId),
    keyBase64: toBase64(options.aesKey),
    authorPubBase64: toBase64(options.authorPubSpki),
    fingerprintHex: toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', options.authorPubSpki))),
  }
}

/* ------------------------------- zip 读取器 ------------------------------- */

/**
 * 从（明文）netmod 字节里读指定 zip 条目；STORED 与 DEFLATE 都支持，找不到返回 null。
 * 打包前的「已加固检测」与 modinfo 提取共用这一份。
 */
export async function readZipEntryBytes(plain: Uint8Array, name: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const view = new DataView(plain.buffer, plain.byteOffset, plain.byteLength)
  const eocd = findEocd(view)
  if (!eocd) return null
  let offset = eocd.entryOffset
  for (let i = 0; i < eocd.entryCount; i++) {
    if (view.getUint32(offset, true) !== 0x0201_4b50) throw new Error('zip 中央目录损坏')
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const entryName = new TextDecoder().decode(
      new Uint8Array(plain.buffer, plain.byteOffset + offset + 46, nameLength),
    )
    if (entryName === name) {
      const abs = plain.byteOffset + localOffset
      if (view.getUint32(abs, true) !== 0x0403_4b50) throw new Error('zip 本地头损坏')
      const localNameLength = view.getUint16(abs + 26, true)
      const localExtraLength = view.getUint16(abs + 28, true)
      const dataStart = abs + 30 + localNameLength + localExtraLength
      const raw = new Uint8Array(view.buffer, dataStart, compressedSize)
      if (method === 0) return raw.slice()
      if (method !== 8) throw new Error(`不支持的 zip 压缩方式（${method}）`)
      const stream = new Blob([raw.slice() as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      return new Uint8Array(await new Response(stream).arrayBuffer())
    }
    offset += 46 + nameLength + extraLength + commentLength
  }
  return null
}

function findEocd(view: DataView): { entryCount: number; entryOffset: number } | null {
  // EOCD 最短 22 字节，注释最长 65535 —— 从文件尾部往回扫这一段。
  const start = Math.max(0, view.byteLength - 22 - 65_535)
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) !== 0x0605_4b50) continue
    const entryCount = view.getUint16(i + 10, true)
    const entryOffset = view.getUint32(i + 16, true)
    if (entryOffset + 22 <= view.byteLength) return { entryCount, entryOffset }
  }
  return null
}

/**
 * 判断一段明文是不是**已经是 ModFortify 加固包**（payload.bin 以 MFORT 魔数开头）。
 * 打包入口用它拒绝二次加固：对加固包再套壳会让两层壳同时剥开，
 * 且攻击者可以借嵌套把别人的加固包套上自己的签名身份（洗白作者）。
 */
export async function looksLikeFortified(plain: Uint8Array): Promise<boolean> {
  const payload = await readZipEntryBytes(plain, 'payload.bin')
  if (!payload || payload.length < MAGIC.length) return false
  for (let i = 0; i < MAGIC.length; i++) {
    if (payload[i] !== MAGIC.charCodeAt(i)) return false
  }
  return true
}

/* ------------------------------- zip 写入器 ------------------------------- */

let crcTable: number[] | null = null

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb8_8320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffff_ffff
  for (const x of data) crc = crcTable[(crc ^ x) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffff_ffff) >>> 0
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const d = (((date.getFullYear() - 1980) & 0x7f) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: d }
}

function u16le(v: number): [number, number] {
  return [v & 0xff, (v >> 8) & 0xff]
}

function u32le(v: number): [number, number, number, number] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]
}

/**
 * 生成一个全部 STORED（不压缩）的 zip。条目名只用 ASCII（游戏核心按 UTF-8 校验条目名，
 * ASCII 是其子集恒通过）。.NET 的 ZipArchive 读 STORED 没有任何问题。
 */
export function writeZipStored(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array<ArrayBuffer> {
  const out: number[] = []
  const central: number[] = []
  const { time, date } = dosDateTime(new Date())

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name)
    const crc = crc32(entry.data)
    const offset = out.length

    out.push(...u32le(0x0403_4b50), 20, 0, ...u16le(0x0800), ...u16le(0)) // 本地头 + 版本 + 标志(UTF-8) + STORED
    out.push(...u16le(time), ...u16le(date), ...u32le(crc))
    out.push(...u32le(entry.data.length), ...u32le(entry.data.length), ...u16le(nameBytes.length), ...u16le(0))
    for (const ch of nameBytes) out.push(ch)
    for (const x of entry.data) out.push(x)

    central.push(...u32le(0x0201_4b50), ...u16le(20), ...u16le(20), ...u16le(0x0800), ...u16le(0))
    central.push(...u16le(time), ...u16le(date), ...u32le(crc))
    central.push(...u32le(entry.data.length), ...u32le(entry.data.length), ...u16le(nameBytes.length))
    central.push(...u16le(0), ...u16le(0), ...u16le(0), ...u16le(0), ...u32le(0), ...u32le(offset))
    for (const ch of nameBytes) central.push(ch)
  }

  const centralOffset = out.length
  out.push(...central)
  const centralSize = out.length - centralOffset

  out.push(...u32le(0x0605_4b50), ...u16le(0), ...u16le(0))
  out.push(...u16le(entries.length), ...u16le(entries.length))
  out.push(...u32le(centralSize), ...u32le(centralOffset), ...u16le(0))

  return new Uint8Array(out) as Uint8Array<ArrayBuffer>
}

/* ------------------------------ 整包编排 ------------------------------ */

export interface WebPackInput {
  /** 原始 netmod 的字节（明文，从 FileDrop 读出）。 */
  plain: Uint8Array<ArrayBuffer>
  /** 从原始 netmod 里读出的 modinfo.json 字节（v2 必需）。 */
  modinfoBytes: Uint8Array<ArrayBuffer>
  /** 原始文件名（记录进 modfortify.json，给人看的）。 */
  sourceName: string
  /** 包名 / 版本（= modinfo 的 PackageName / Version，必须与外层一致）。 */
  packageName: string
  version: string
  /** ModShell.dll 的字节（GET /scforge/fortify/shell 取回）。 */
  shellDll: Uint8Array<ArrayBuffer>
  authorKey: AuthorKey
}

export interface WebPackOutput {
  /** 加固后的 netmod（保存下载的就是它）。 */
  netmod: Uint8Array<ArrayBuffer>
  /** 给登记接口的字段（keyId / key / authorPublicKey / authorKeyFingerprint）。 */
  keyId: string
  key: string
  authorPublicKey: string
  authorKeyFingerprint: string
  packageName: string
  version: string
  /** *.secret.json 的文本（给也用 CLI 的作者存档用）。 */
  secretJson: string
}

/** 一步到位：明文 netmod → 加固 netmod + 登记所需的全部字段。 */
export async function packNetmod(input: WebPackInput): Promise<WebPackOutput> {
  // 核心层的二次加固拒绝：UI 会在拖入时友好提示，但真正的闸门在这里 ——
  // 任何调用方（包括未来新写的界面）都绕不过去。
  if (await looksLikeFortified(input.plain)) {
    throw new Error('这个包已经是加固包，不能再次加固 —— 请用原始未加固的 netmod')
  }
  const aesKey = randomBytes(KEY_LEN)
  const keyId = randomBytes(KEY_ID_LEN)

  const packed = await packPayload({
    plain: input.plain,
    modinfoBytes: input.modinfoBytes,
    packageName: input.packageName,
    version: input.version,
    sourceName: input.sourceName,
    aesKey,
    keyId,
    privateKey: input.authorKey.privateKey,
    authorPubSpki: input.authorKey.publicKeySpki,
    serviceHost: FORTIFY_SERVICE_HOST,
  })

  const meta = JSON.stringify(
    {
      format: 'MFORT1',
      formatVersion: FORMAT_VERSION,
      sourceFile: input.sourceName,
      packageName: input.packageName,
      version: input.version,
      service: FORTIFY_SERVICE_HOST,
      sigAlg: 'ecdsa-p256-sha256',
      metaSha256: toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', input.modinfoBytes))),
      payloadEntry: 'payload.bin',
      authorPubEntry: 'author.pub',
      payloadBytes: packed.payload.length,
      packedBy: 'web',
    },
    null,
    2,
  )

  const secretJson = JSON.stringify(
    {
      keyId: packed.keyIdHex,
      packageName: input.packageName,
      version: input.version,
      key: packed.keyBase64,
    },
    null,
    2,
  )

  const netmod = writeZipStored([
    { name: 'modinfo.json', data: input.modinfoBytes },
    { name: 'author.pub', data: input.authorKey.publicKeySpki },
    { name: 'ModShell.dll', data: input.shellDll },
    { name: 'payload.bin', data: packed.payload },
    { name: 'modfortify.json', data: new TextEncoder().encode(meta + '\n') },
  ])

  return {
    netmod,
    keyId: packed.keyIdHex,
    key: packed.keyBase64,
    authorPublicKey: packed.authorPubBase64,
    authorKeyFingerprint: packed.fingerprintHex,
    packageName: input.packageName,
    version: input.version,
    secretJson,
  }
}
