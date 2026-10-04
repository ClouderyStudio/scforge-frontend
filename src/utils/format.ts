/** Presentation helpers shared across the catalogue UI. */

const NUMBER = new Intl.NumberFormat('zh-CN')

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1).replace(/\.0$/, '') + '亿'
  if (value >= 10_000) return (value / 10_000).toFixed(1).replace(/\.0$/, '') + '万'
  return NUMBER.format(value)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, index)
  return (index === 0 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)) + ' ' + units[index]
}

/**
 * ISO 时间 -> `2026-01-02 20:04`（**北京时间**）。
 *
 * 服务端统一以 UTC+8 输出（形如 2026-10-04T20:00:00+08:00），这里再显式按
 * Asia/Shanghai 格式化一次，确保无论浏览器在哪个时区都显示北京时间。
 */
const BEIJING_DATE_TIME = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const parts = Object.fromEntries(BEIJING_DATE_TIME.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

export function formatDate(iso: string | null | undefined): string {
  const value = formatDateTime(iso)
  return value === '—' ? value : value.slice(0, 10)
}

/** "3 天前" style relative time, falling back to an absolute date past a month. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minute = 60_000
  if (diff < minute) return '刚刚'
  if (diff < 60 * minute) return Math.floor(diff / minute) + ' 分钟前'
  if (diff < 24 * 60 * minute) return Math.floor(diff / (60 * minute)) + ' 小时前'
  if (diff < 30 * 24 * 60 * minute) return Math.floor(diff / (24 * 60 * minute)) + ' 天前'
  return formatDate(iso)
}

/** Stable per-string hue so generated avatars and tags stay recognisable. */
export function hashHue(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

export function initials(name: string): string {
  const source = (name ?? '').trim()
  if (!source) return '?'
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length > 1) return (words[0]![0]! + words[1]![0]!).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}
