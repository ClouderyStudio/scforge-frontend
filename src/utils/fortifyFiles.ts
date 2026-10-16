/**
 * ModFortify 加固页的本地文件解析。
 *
 * 作者在本机跑 `modpack pack` 会得到两样东西：
 *   - `*.secret.json`：keyId / packageName / version / key（AES 密钥明文，只交给服务端）
 *   - 加固 netmod 本身：里面带着 `author.pub`（作者签名公钥的 SPKI/DER）
 *
 * 这个模块把两样东西解析成登记接口要的字段 —— 作者在网页上拖两个文件就能填完表单，
 * 不用手抄 base64。zip 条目用浏览器原生的 `DecompressionStream('deflate-raw')` 解压，
 * 不引第三方依赖（author.pub 只有几十字节，不值得为它加一个 zip 库）。
 */

export interface SecretFile {
  keyId: string
  packageName: string
  version: string
  key: string
}

/** 解析 pack 产出的 *.secret.json。字段名对不上就报错，不做静默容错。 */
export async function parseSecretFile(file: File): Promise<SecretFile> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new Error(`${file.name} 不是合法的 JSON`)
  }
  const body = raw as Record<string, unknown>
  const missing = (['keyId', 'packageName', 'version', 'key'] as const).filter(
    (k) => typeof body[k] !== 'string' || (body[k] as string).length === 0,
  )
  if (missing.length) {
    throw new Error(`${file.name} 缺少字段：${missing.join(' / ')}（它应该是 pack 产出的 *.secret.json）`)
  }
  return {
    keyId: body.keyId as string,
    packageName: body.packageName as string,
    version: body.version as string,
    key: body.key as string,
  }
}

/**
 * 从加固 netmod 里取出 `author.pub` 并计算指纹。
 * @returns `authorPublicKey`（base64 的 SPKI/DER）与 `authorKeyFingerprint`（SHA-256 的十六进制）
 */
export async function readAuthorPub(file: File): Promise<{ authorPublicKey: string; authorKeyFingerprint: string }> {
  const der = await extractZipEntry(file, 'author.pub')
  if (!der) {
    throw new Error(`${file.name} 里没有 author.pub（它应该是一个加固过的 netmod）`)
  }
  const digest = await crypto.subtle.digest('SHA-256', der)
  return {
    authorPublicKey: toBase64(der),
    authorKeyFingerprint: toHex(new Uint8Array(digest)),
  }
}

/** 从 netmod 里读任意条目的原始字节（网页打包用它取 modinfo.json）。 */
export async function readNetmodEntry(file: File, name: string): Promise<Uint8Array<ArrayBuffer> | null> {
  return extractZipEntry(file, name)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/* --------------------------- 最小 zip 读取器 --------------------------- */

/** 找到中央目录里名为 `name` 的条目，返回解压后的内容；找不到返回 null。 */
async function extractZipEntry(file: File, name: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const view = new DataView(await file.arrayBuffer())
  const eocd = findEndOfCentralDirectory(view)
  if (!eocd) return null

  let offset = eocd.entryOffset
  for (let i = 0; i < eocd.entryCount; i++) {
    if (view.getUint32(offset, true) !== 0x0201_4b50) return null // 中央目录损坏
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)

    if (matchName(view, offset + 46, nameLength, name)) {
      return readEntryData(view, localOffset, method, compressedSize)
    }
    offset += 46 + nameLength + extraLength + commentLength
  }
  return null
}

function findEndOfCentralDirectory(view: DataView): { entryCount: number; entryOffset: number } | null {
  // EOCD 最短 22 字节，且注释最长 65535 —— 从文件尾部往回扫这一段就够了。
  const start = Math.max(0, view.byteLength - 22 - 65_535)
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) !== 0x0605_4b50) continue
    const entryCount = view.getUint16(i + 10, true)
    const entryOffset = view.getUint32(i + 16, true)
    if (entryOffset + 22 <= view.byteLength) return { entryCount, entryOffset }
  }
  return null
}

function matchName(view: DataView, offset: number, length: number, name: string): boolean {
  if (length !== name.length) return false
  for (let i = 0; i < length; i++) {
    if (view.getUint8(offset + i) !== name.charCodeAt(i)) return false
  }
  return true
}

async function readEntryData(
  view: DataView,
  localOffset: number,
  method: number,
  compressedSize: number,
): Promise<Uint8Array<ArrayBuffer>> {
  // 本地头的文件名/扩展字段长度可能与中央目录不同，必须按本地头的读。
  if (view.getUint32(localOffset, true) !== 0x0403_4b50) throw new Error('文件不是合法的 zip（本地头损坏）')
  const nameLength = view.getUint16(localOffset + 26, true)
  const extraLength = view.getUint16(localOffset + 28, true)
  const dataStart = localOffset + 30 + nameLength + extraLength
  const raw = new Uint8Array(view.buffer, dataStart, compressedSize)

  // 0 = stored；8 = deflate。加固包由 .NET ZipArchive 生成，两种都可能出现。
  // slice() 顺带把缓冲区拷成独占的 ArrayBuffer（Blob/SubtleCrypto 都只认非 Shared 的那份）。
  if (method === 0) return raw.slice()
  if (method !== 8) throw new Error(`不支持的 zip 压缩方式（${method}）`)
  const stream = new Blob([raw.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
