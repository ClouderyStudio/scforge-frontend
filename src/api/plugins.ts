/** SCForge 插件目录、作者维护与评论接口。 */
import { http } from './http'
import type {
  Comment,
  GameVersionOption,
  CommentList,
  PluginDetail,
  PluginSearchQuery,
  PluginSearchResult,
  PluginSummary,
  PluginVersion,
  UploadSummary,
  VoteState,
} from './types'

export const pluginsApi = {
  /** 平台支持的游戏版本（新的在前）——发布与筛选的取值来源。 */
  gameVersions: () => http.get<{ items: GameVersionOption[] }>('/scforge/game-versions'),

  search: (query: PluginSearchQuery, signal?: AbortSignal) =>
    http.get<PluginSearchResult>('/scforge/plugins', { ...query } as Record<string, string | number>, signal),

  /** 精选：可按资源类型取（首页的插件 / 模组两个板块各取一次）。 */
  featured: (limit = 6, kind?: string) =>
    http.get<{ items: PluginSummary[] }>('/scforge/plugins/featured', kind ? { limit, kind } : { limit }),

  recent: (limit = 8, kind?: string) =>
    http.get<{ items: PluginSummary[] }>('/scforge/plugins/recent', kind ? { limit, kind } : { limit }),

  detail: (idOrSlug: string) => http.get<{ plugin: PluginDetail }>(`/scforge/plugins/${encodeURIComponent(idOrSlug)}`),

  /** `versions` 为最新在前；服务端在下载时累加计数。 */
  downloadUrl: (versionId: string) => `/scforge/versions/${encodeURIComponent(versionId)}/download`,

  /** 发布新插件（连同首个版本）。提交后进入待审核。 */
  create: (form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; plugin: PluginDetail }>('/scforge/plugins', form, signal),

  /** 作者编辑插件资料（multipart）：编辑会重新进入待审核。 */
  update: (pluginId: string, form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; plugin: PluginDetail }>(
      `/scforge/plugins/${encodeURIComponent(pluginId)}`,
      form,
      signal,
      'PUT',
    ),

  /** 把被驳回的插件重新提交审核。 */
  resubmit: (pluginId: string) =>
    http.post<{ success: boolean; plugin: PluginDetail }>(`/scforge/plugins/${encodeURIComponent(pluginId)}/resubmit`),

  remove: (pluginId: string) => http.del<{ success: boolean }>(`/scforge/plugins/${encodeURIComponent(pluginId)}`),

  /* ---------------- 版本维护（作者） ---------------- */

  /** 追加版本：新版本进入待审核。 */
  addVersion: (pluginId: string, form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; version: PluginVersion }>(
      `/scforge/plugins/${encodeURIComponent(pluginId)}/versions`,
      form,
      signal,
    ),

  /** 编辑版本元数据：重新进入待审核。 */
  updateVersion: (
    versionId: string,
    body: { channel?: string; changelog?: string; gameVersion?: string; gameVersions?: string[]; dependencies?: string[] },
  ) => http.patch<{ success: boolean; version: PluginVersion }>(`/scforge/versions/${encodeURIComponent(versionId)}`, body),

  /** 替换版本的插件包文件：重新进入待审核。 */
  replaceVersionFile: (versionId: string, form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; version: PluginVersion }>(
      `/scforge/versions/${encodeURIComponent(versionId)}/file`,
      form,
      signal,
    ),

  resubmitVersion: (versionId: string) =>
    http.post<{ success: boolean; version: PluginVersion }>(
      `/scforge/versions/${encodeURIComponent(versionId)}/resubmit`,
    ),

  deleteVersion: (versionId: string) => http.del<{ success: boolean }>(`/scforge/versions/${encodeURIComponent(versionId)}`),
}

export const votesApi = {
  /** 幂等：重复点同一方向不会重复计数。 */
  up: (pluginId: string) => http.put<VoteState>(`/scforge/plugins/${encodeURIComponent(pluginId)}/vote/up`),
  down: (pluginId: string) => http.put<VoteState>(`/scforge/plugins/${encodeURIComponent(pluginId)}/vote/down`),
  clear: (pluginId: string) => http.del<VoteState>(`/scforge/plugins/${encodeURIComponent(pluginId)}/vote`),
  status: (pluginId: string) => http.get<VoteState>(`/scforge/plugins/${encodeURIComponent(pluginId)}/vote`),
}

export const commentsApi = {
  list: (pluginId: string, signal?: AbortSignal) =>
    http.get<CommentList>(`/scforge/plugins/${encodeURIComponent(pluginId)}/comments`, undefined, signal),

  create: (pluginId: string, body: string, parentId?: string | null) =>
    http.post<{ success: boolean; comment: Comment }>(
      `/scforge/plugins/${encodeURIComponent(pluginId)}/comments`,
      { body, parentId: parentId ?? null },
    ),

  update: (commentId: string, body: string) =>
    http.patch<{ success: boolean; comment: Comment }>(`/scforge/comments/${encodeURIComponent(commentId)}`, { body }),

  remove: (commentId: string) => http.del<{ success: boolean }>(`/scforge/comments/${encodeURIComponent(commentId)}`),

  voteUp: (commentId: string) => http.put<VoteState>(`/scforge/comments/${encodeURIComponent(commentId)}/vote/up`),
  voteDown: (commentId: string) => http.put<VoteState>(`/scforge/comments/${encodeURIComponent(commentId)}/vote/down`),
  voteClear: (commentId: string) => http.del<VoteState>(`/scforge/comments/${encodeURIComponent(commentId)}/vote`),
}

export const mineApi = {
  list: () => http.get<{ items: PluginSummary[] }>('/scforge/plugins/mine'),
  summary: () => http.get<UploadSummary>('/scforge/plugins/mine/summary'),
}
