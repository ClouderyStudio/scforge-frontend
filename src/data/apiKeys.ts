/**
 * API Key 的展示常量。
 *
 * 作用域的中文名与说明**由后端下发**（`GET /scforge/api-keys/scopes`），这里只放
 * 前端自己要用到的、不属于服务端契约的东西：状态配色、过期预设与命令行示例。
 */
import type { ApiKeyScope, ApiKeyStatus } from '@/api/types'

/** 与后端 `ScforgeApiKeyScopes.TokenPrefix` 一致。 */
export const TOKEN_PREFIX = 'scf_'

/** 状态 → CSS 修饰名（状态串直接用后端的中文值）。 */
export const STATUS_CLASS: Record<ApiKeyStatus, string> = {
  有效: 'sc-apikey__status--active',
  已吊销: 'sc-apikey__status--revoked',
  已过期: 'sc-apikey__status--expired',
}

/**
 * 过期时间预设（天）。留空 = 长期有效 —— 对发版机器人是合理的，
 * 但个人随手发的 Key 建议设个期限，泄漏时不用等人工巡检。
 */
export const EXPIRY_PRESETS: { value: number | null; label: string }[] = [
  { value: null, label: '长期有效' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
  { value: 365, label: '1 年' },
]

/**
 * 把「N 天后」转成后端要的 UTC ISO 串。
 * 用 UTC 而非本地时间：后端拿 DateTime? 存的是 UTC 时刻，差一个时区就会差 8 小时。
 */
export function expiryToIso(days: number | null): string | null {
  if (days === null) return null
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

/** 把后端的 UTC 时间转成 `<input type="datetime-local">` 需要的本地 `YYYY-MM-DDTHH:mm`。 */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `datetime-local` 的本地时间串 → UTC ISO。 */
export function localInputToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * 命令行用法示例。
 * 作用域只列出这把 Key 实际持有的，让读者一眼看出"发版机器需要哪几个"。
 */
export function curlExample(apiKey: { token: string; scopes: ApiKeyScope[] }): string {
  const base = 'https://api.cldery.com'
  const header = `-H "Authorization: Bearer ${apiKey.token}"`
  if (apiKey.scopes.includes('publish')) {
    return [
      `# 上传插件（包体走 multipart，其余字段与网页发布一致）`,
      `curl -X POST "${base}/scforge/addons" \\`,
      `  ${header} \\`,
      `  -F "package=@MyPlugin.dll" -F "version=1.0.0" -F "kind=plugin" …`,
    ].join('\n')
  }
  return [
    `# 查询我发布的资源`,
    `curl "${base}/scforge/addons/mine" \\`,
    `  ${header}`,
  ].join('\n')
}
