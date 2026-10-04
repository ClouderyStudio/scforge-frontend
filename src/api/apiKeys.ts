/**
 * API Key 的两套接口：用户自助（/scforge/api-keys）与超管后台（/scforge/admin/api-keys）。
 *
 * 与其余 SCForge 接口一样走 HttpOnly Cookie 会话 —— 网页上**不需要**持有令牌。
 * 令牌明文只在 create / rotate 的响应里出现一次，别的接口（包括超管）都取不回来，
 * 因此这里不存在"再查一次"的调用。
 */
import { http } from './http'
import type { ApiKeyIssued, ApiKeyRecord, ApiKeyScope, ApiKeyScopeCatalog } from './types'

export interface ApiKeyCreateBody {
  /** 名字只是给人看的标识，不参与鉴权。留空按「未命名」处理。 */
  name?: string
  scopes: ApiKeyScope[]
  /** 过期时间（UTC）。留空 = 长期有效。 */
  expiresAt?: string | null
}

export const apiKeysApi = {
  /** 可授予的作用域目录（含中文名与说明）。 */
  scopes: () => http.get<ApiKeyScopeCatalog>('/scforge/api-keys/scopes'),

  /** 我的 Key 列表（含已吊销，便于确认「那把旧的真的失效了」）。 */
  mine: () => http.get<{ items: ApiKeyRecord[] }>('/scforge/api-keys'),

  /** 签发一把新 Key；`manage` 作用域会被后端丢弃。 */
  create: (body: ApiKeyCreateBody) => http.post<ApiKeyIssued>('/scforge/api-keys', body),

  revoke: (id: string, reason?: string) =>
    http.post<{ success: boolean }>(`/scforge/api-keys/${encodeURIComponent(id)}/revoke`, {
      reason: reason ?? null,
    }),

  /** 轮换：吊销旧的、签发一把同权限的新 Key（泄露后一键换锁）。 */
  rotate: (id: string) => http.post<ApiKeyIssued>(`/scforge/api-keys/${encodeURIComponent(id)}/rotate`),
}

export const adminApiKeysApi = {
  /**
   * 可授予的作用域目录。
   * 刻意复用自助端点 `/scforge/api-keys/scopes`：那里返回的 `items` 是**全部**作用域
   * （含 manage），只有自助签发时才会把 manage 过滤掉 —— 后台正是要这个完整目录。
   */
  scopes: () => http.get<ApiKeyScopeCatalog>('/scforge/api-keys/scopes'),

  /** 全站 Key 列表（含已吊销），供后台巡检。 */
  list: () => http.get<{ items: ApiKeyRecord[] }>('/scforge/admin/api-keys'),

  /** 为指定用户签发一把 Key；这里可以授予 manage 作用域。 */
  createForUser: (target: { userId: string; userName: string }, body: ApiKeyCreateBody) =>
    http.post<ApiKeyIssued>('/scforge/admin/api-keys', body, {
      userId: target.userId,
      userName: target.userName,
    }),

  revoke: (id: string, reason?: string) =>
    http.post<{ success: boolean; message?: string }>(`/scforge/admin/api-keys/${encodeURIComponent(id)}/revoke`, {
      reason: reason ?? null,
    }),

  rotate: (id: string) => http.post<ApiKeyIssued>(`/scforge/admin/api-keys/${encodeURIComponent(id)}/rotate`),
}
