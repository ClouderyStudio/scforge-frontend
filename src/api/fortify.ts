/**
 * ModFortify 加固密钥的作者自助接口（/scforge/fortify/keys）。
 *
 * 角色分工与 API Key 页不同：这里的对象是「某个资源的加固密钥」，挂在插件/模组上，
 * 作者在编辑页里管理；壳取密钥走的是另一个匿名端点（/scforge/fortify/key），
 * 那条路网页用不到，也不该用 —— 它只服务客户端。
 *
 * 「登记」同时承担轮换：同一个 keyId 重复提交是幂等的；换了 keyId 则旧的那把
 * 立刻作废（一个版本只留一把生效的密钥）。密钥明文只在登记请求里出现，
 * 列表接口刻意不下发（作者自己手里有 pack 产出的 *.secret.json）。
 */
import { http } from './http'
import type { FortifyKeyRecord } from './types'

export interface FortifyRegisterBody {
  /** 16 字节随机值的十六进制（32 字符），来自 secret.json 的 keyId。 */
  keyId: string
  /** modinfo.json 的 PackageName（= 签名头部里的包名）。 */
  packageName: string
  /** 版本字符串（= 签名头部里的版本）。 */
  version: string
  /** AES-256 密钥，base64 的 32 字节，来自 secret.json 的 key。 */
  key: string
  /** 作者签名公钥，base64 的 SPKI/DER（即 netmod 里 author.pub 的内容）。 */
  authorPublicKey: string
  /** 公钥指纹：SHA-256(SPKI) 的十六进制，64 字符。 */
  authorKeyFingerprint: string
}

export const fortifyApi = {
  /** 某个资源的加固密钥列表（含已作废，便于确认「旧的真的失效了」）。 */
  list: (pluginId: string) =>
    http.get<{ items: FortifyKeyRecord[] }>(
      `/scforge/fortify/keys/${encodeURIComponent(pluginId)}`,
    ),

  /** 登记或轮换。 */
  register: (pluginId: string, body: FortifyRegisterBody) =>
    http.post<{ success: boolean; notice: string }>(
      `/scforge/fortify/keys/${encodeURIComponent(pluginId)}`,
      body,
    ),

  /** 作废一把密钥（立刻生效，之后取不到）。这是泄漏时唯一管用的那把锁。 */
  revoke: (pluginId: string, id: string) =>
    http.post<{ success: boolean }>(
      `/scforge/fortify/keys/${encodeURIComponent(pluginId)}/${encodeURIComponent(id)}/revoke`,
    ),
}
