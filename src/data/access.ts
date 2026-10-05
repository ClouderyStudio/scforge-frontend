/**
 * 隐私访问的常量与展示文案。
 *
 * 数值常量与后端 `ScforgeAccessMode` / `ScforgeCatalog` 对齐 —— 前端先挡一道是 为了
 * 即时反馈，真正的校验永远在服务端（前端只是不发无效请求，不构成防线）。
 *
 * 访问模式的**权威文案**来自后端 `GET /scforge/addons/access/modes`，
 * 页面优先用后端下发的 label / description；这里的本地文案只是首屏兜底，
 * 避免为了渲染一个下拉框先发一次请求。
 */
import type { AccessMode } from '@/api/types'

/** 口令最短长度（后端 `ScforgeAccessMode.MinPasswordLength`）。 */
export const MIN_ACCESS_PASSWORD = 6

/** 授权名单人数上限（后端 `ScforgeCatalog.MaxAccessGrants`）。 */
export const MAX_ACCESS_GRANTS = 200

/** 访问提示语长度上限（后端 `ScforgeCatalog.MaxAccessHintLength`）。 */
export const MAX_ACCESS_HINT = 200

export interface AccessModeOption {
  key: AccessMode
  label: string
  description: string
}

export const ACCESS_MODES: AccessModeOption[] = [
  { key: 'public', label: '公开', description: '任何人都能在目录里找到并下载' },
  { key: 'password', label: '口令访问', description: '不进目录，拿到口令的人可访问' },
  { key: 'whitelist', label: '指定人员可见', description: '不进目录，只有名单内的人可访问' },
]

/**
 * 发布页只提供前两种。
 * 白名单要按 Identity 域的用户 GUID 授权，而插件 Id 此刻还不存在，
 * 因此这一步只能先建出插件、再到编辑页里加名单。
 */
export const NEW_ACCESS_MODES: AccessModeOption[] = ACCESS_MODES.filter((m) => m.key !== 'whitelist')

/** 分段按钮要的是 `{ value, label }`，与上面的 `{ key, … }` 差一个字段名。 */
export function toSegmentedOptions(modes: AccessModeOption[]): { value: string; label: string }[] {
  return modes.map((m) => ({ value: m.key, label: m.label }))
}

export function accessModeLabel(mode: AccessMode | undefined): string {
  return ACCESS_MODES.find((m) => m.key === mode)?.label ?? '公开'
}
