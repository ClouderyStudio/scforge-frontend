/** 审核状态在界面上的统一文案与配色调性。 */
import type { ContentStatus } from '@/api/types'

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
}

export const CONTENT_STATUS_ICONS: Record<ContentStatus, string> = {
  pending: 'pending-actions',
  published: 'task-alt',
  rejected: 'block',
}

/** 供 :class="...--tone" 使用的调性名。 */
export function contentStatusTone(status: ContentStatus): 'pending' | 'published' | 'rejected' {
  return status
}

/** 审核队列可选的筛选项。 */
export const REVIEW_STATUS_OPTIONS = [
  { value: 'pending', label: '待审核' },
  { value: 'published', label: '已发布' },
  { value: 'rejected', label: '已驳回' },
] as const
