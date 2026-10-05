/**
 * 管理后台接口（/scforge/admin）。
 *
 * 权限边界由服务端判定，前端只负责按 me() 返回的身份显示/隐藏入口；
 * 越权请求会被后端以 403 + 中文 message 拒绝。
 */
import { http } from './http'
import type {
  AdminMe,
  AdminPluginPage,
  AdminRecord,
  AdminRole,
  AdminSummary,
  AdminVersionPage,
  GameVersionOption,
  PluginDetail,
  PluginVersion,
  UserCandidate,
} from './types'

export interface ReviewBody {
  approve: boolean
  note?: string | null
}

export interface AdminListQuery {
  q?: string
  status?: string
  page?: number
  pageSize?: number
}

export const adminApi = {
  /** 当前用户的后台身份；任何登录用户都可调，非管理员返回 isAdmin=false。 */
  me: () => http.get<AdminMe>('/scforge/admin/me'),

  summary: () => http.get<AdminSummary>('/scforge/admin/summary'),

  reviewPlugins: (query: AdminListQuery = {}) =>
    http.get<AdminPluginPage>('/scforge/admin/review/addons', { ...query } as Record<string, string | number>),

  reviewVersions: (query: AdminListQuery = {}) =>
    http.get<AdminVersionPage>('/scforge/admin/review/versions', { ...query } as Record<string, string | number>),

  /** 审核插件提交：通过 / 驳回（驳回必须给理由）。 */
  reviewPlugin: (addonId: string, body: ReviewBody) =>
    http.post<{ success: boolean; addon: PluginDetail }>(
      `/scforge/admin/addons/${encodeURIComponent(addonId)}/review`,
      body,
    ),

  reviewVersion: (versionId: string, body: ReviewBody) =>
    http.post<{ success: boolean; version: PluginVersion }>(
      `/scforge/admin/versions/${encodeURIComponent(versionId)}/review`,
      body,
    ),

  /** 全量插件列表（含待审核与已驳回）。 */
  allPlugins: (query: AdminListQuery = {}) =>
    http.get<AdminPluginPage>('/scforge/admin/addons', { ...query } as Record<string, string | number>),

  /** 内容管理：编辑任意插件资料。 */
  updatePlugin: (addonId: string, form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; addon: PluginDetail }>(
      `/scforge/admin/addons/${encodeURIComponent(addonId)}`,
      form,
      signal,
      'PUT',
    ),

  deletePlugin: (addonId: string) => http.del<{ success: boolean }>(`/scforge/admin/addons/${encodeURIComponent(addonId)}`),

  /* ---------------- 游戏版本（仅超管可写） ---------------- */

  listGameVersions: () => http.get<{ items: GameVersionOption[] }>('/scforge/admin/game-versions'),

  addGameVersion: (body: { version: string; beta?: boolean }) =>
    http.post<{ success: boolean; version: GameVersionOption }>('/scforge/admin/game-versions', body),

  deleteGameVersion: (id: string) =>
    http.del<{ success: boolean }>(`/scforge/admin/game-versions/${encodeURIComponent(id)}`),

  /** 按用户名 / 邮箱搜索可指定的用户（仅超管）。 */
  searchUsers: (q: string) => http.get<{ items: UserCandidate[] }>('/scforge/admin/users', { q }),

  listAdmins: () => http.get<{ items: AdminRecord[] }>('/scforge/admin/admins'),

  upsertAdmin: (body: { username: string; role: AdminRole; permissions?: string[] }) =>
    http.post<{ success: boolean; admin: AdminRecord }>('/scforge/admin/admins', body),

  deleteAdmin: (id: string) => http.del<{ success: boolean }>(`/scforge/admin/admins/${encodeURIComponent(id)}`),
}
