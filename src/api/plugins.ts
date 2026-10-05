/**
 * SCForge 插件目录、作者维护、评论与隐私访问接口。
 *
 * 路由前缀是 `/scforge/addons`（不是 `/scforge/plugins`）：后端把「插件 / 模组」
 * 统一称作 addon，两块板只是 `kind` 的预设筛选。响应体里资源字段是 `addon`、
 * 评论里是 `addonId` —— 与 `src/api/types.ts` 的契约一致。
 */
import { accessHeaders, http } from './http'
import type {
  AccessCandidate,
  AccessGrant,
  AccessMode,
  AccessModeOption,
  AccessUnlock,
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
    http.get<PluginSearchResult>('/scforge/addons', { ...query } as Record<string, string | number>, signal),

  /** 精选：可按资源类型取（首页的插件 / 模组两个板块各取一次）。 */
  featured: (limit = 6, kind?: string) =>
    http.get<{ items: PluginSummary[] }>('/scforge/addons/featured', kind ? { limit, kind } : { limit }),

  recent: (limit = 8, kind?: string) =>
    http.get<{ items: PluginSummary[] }>('/scforge/addons/recent', kind ? { limit, kind } : { limit }),

  /**
   * 详情。自动带上解锁令牌 —— 隐私插件解锁后要重新拉一次才能拿到完整内容，
   * 令牌由 http.ts 的 sessionStorage 托管，这里不暴露 token 参数。
   */
  detail: (idOrSlug: string) =>
    http.get<{ addon: PluginDetail }>(
      `/scforge/addons/${encodeURIComponent(idOrSlug)}`,
      undefined,
      undefined,
      accessHeaders(),
    ),

  /** `versions` 为最新在前；服务端在下载时累加计数。 */
  downloadUrl: (versionId: string) => `/scforge/versions/${encodeURIComponent(versionId)}/download`,

  /** 发布新插件（连同首个版本）。提交后进入待审核。 */
  create: (form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; addon: PluginDetail }>('/scforge/addons', form, signal),

  /** 作者编辑插件资料（multipart）：编辑会重新进入待审核。 */
  update: (pluginId: string, form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; addon: PluginDetail }>(
      `/scforge/addons/${encodeURIComponent(pluginId)}`,
      form,
      signal,
      'PUT',
    ),

  /** 把被驳回的插件重新提交审核。 */
  resubmit: (pluginId: string) =>
    http.post<{ success: boolean; addon: PluginDetail }>(`/scforge/addons/${encodeURIComponent(pluginId)}/resubmit`),

  remove: (pluginId: string) => http.del<{ success: boolean }>(`/scforge/addons/${encodeURIComponent(pluginId)}`),

  /* ---------------- 版本维护（作者） ---------------- */

  /** 追加版本：新版本进入待审核。 */
  addVersion: (pluginId: string, form: FormData, signal?: AbortSignal) =>
    http.upload<{ success: boolean; version: PluginVersion }>(
      `/scforge/addons/${encodeURIComponent(pluginId)}/versions`,
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
  /**
   * 幂等：重复点同一方向不会重复计数。
   * 隐私插件的投票也受访问控制约束，四个方法都带解锁令牌。
   */
  up: (pluginId: string) =>
    http.put<VoteState>(`/scforge/addons/${encodeURIComponent(pluginId)}/vote/up`, undefined, accessHeaders()),
  down: (pluginId: string) =>
    http.put<VoteState>(`/scforge/addons/${encodeURIComponent(pluginId)}/vote/down`, undefined, accessHeaders()),
  clear: (pluginId: string) =>
    http.del<VoteState>(`/scforge/addons/${encodeURIComponent(pluginId)}/vote`, accessHeaders()),
  status: (pluginId: string) =>
    http.get<VoteState>(`/scforge/addons/${encodeURIComponent(pluginId)}/vote`, undefined, undefined, accessHeaders()),
}

export const commentsApi = {
  /**
   * 评论树。隐私插件的评论同样受访问控制约束，
   * 因此要带上解锁令牌（否则 403）—— 令牌由 http.ts 的 sessionStorage 托管。
   */
  list: (pluginId: string, signal?: AbortSignal) =>
    http.get<CommentList>(
      `/scforge/addons/${encodeURIComponent(pluginId)}/comments`,
      undefined,
      signal,
      accessHeaders(),
    ),

  create: (pluginId: string, body: string, parentId?: string | null) =>
    http.post<{ success: boolean; comment: Comment }>(
      `/scforge/addons/${encodeURIComponent(pluginId)}/comments`,
      { body, parentId: parentId ?? null },
      accessHeaders(),
    ),

  update: (commentId: string, body: string) =>
    http.patch<{ success: boolean; comment: Comment }>(`/scforge/comments/${encodeURIComponent(commentId)}`, { body }),

  remove: (commentId: string) => http.del<{ success: boolean }>(`/scforge/comments/${encodeURIComponent(commentId)}`),

  voteUp: (commentId: string) => http.put<VoteState>(`/scforge/comments/${encodeURIComponent(commentId)}/vote/up`),
  voteDown: (commentId: string) => http.put<VoteState>(`/scforge/comments/${encodeURIComponent(commentId)}/vote/down`),
  voteClear: (commentId: string) => http.del<VoteState>(`/scforge/comments/${encodeURIComponent(commentId)}/vote`),
}

export const mineApi = {
  list: () => http.get<{ items: PluginSummary[] }>('/scforge/addons/mine'),
  summary: () => http.get<UploadSummary>('/scforge/addons/mine/summary'),
}

/* ---------------- 隐私访问 ---------------- */

/**
 * 隐私插件的解锁与名单维护。
 *
 * 解锁令牌由 `http.ts` 的 sessionStorage 托管，调用方不需要自己拼请求头 ——
 * `detail` / `downloadUrl` / 投票状态的实际请求都会自动带上（见 `accessHeaders()`）。
 */
export const accessApi = {
  /** 可选的访问方式目录（前端不硬编码文案）。 */
  modes: () => http.get<{ items: AccessModeOption[] }>('/scforge/addons/access/modes'),

  /** 提交口令换解锁令牌；令牌明文只在这次响应里出现。 */
  unlock: (pluginId: string, password: string) =>
    http.post<AccessUnlock>(`/scforge/addons/${encodeURIComponent(pluginId)}/access/unlock`, { password }),

  /** 读取白名单（作者或有内容管理权限的管理员）。 */
  listGrants: (pluginId: string) =>
    http.get<{ items: AccessGrant[] }>(`/scforge/addons/${encodeURIComponent(pluginId)}/access/grants`),

  /**
   * 搜人：按用户名 / 邮箱模糊匹配，供白名单编辑器挑选。
   * 名单里存的是 Identity 域的用户 GUID，让作者手填 GUID 不人道，所以后端提供搜索。
   * 关键词为空即返回前 20 个用户（方便打开面板就有东西可选）。
   */
  searchUsers: (keyword?: string) =>
    http.get<{ items: AccessCandidate[] }>(
      '/scforge/addons/access/users',
      keyword?.trim() ? { keyword: keyword.trim() } : undefined,
    ),

  /** 整体替换白名单；传空数组即清空。 */
  replaceGrants: (pluginId: string, userIds: string[]) =>
    http.put<{ success: boolean; items: AccessGrant[] }>(
      `/scforge/addons/${encodeURIComponent(pluginId)}/access/grants`,
      { userIds },
    ),
}

/**
 * 是否是隐私插件。
 *
 * 隐私插件不进公开目录（搜索 / 精选 / 最近都拿不到），只能通过链接直达；
 * 作者自己的「我的」列表仍会带上 `accessMode`，用来渲染锁标识。
 */
export function isPrivacyPlugin(mode: AccessMode | undefined): boolean {
  return mode === 'password' || mode === 'whitelist'
}
