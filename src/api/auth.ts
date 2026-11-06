/** 会话与登录端点（ClouderyApi Modules/Identity，自建身份中心）。 */
import { http } from './http'
import type { AccountUser, IdentityConfig } from './types'

export const authApi = {
  /** 自建身份中心的授权参数 + 本 API 的回调地址。 */
  config: () => http.get<{ success: boolean } & IdentityConfig>('/identity/auth/config'),

  /** One-time OAuth state, mirrored into an HttpOnly cookie server-side. */
  state: () => http.get<{ success: boolean; state: string }>('/identity/auth/state'),

  /** Exchange the authorization code for a cookie session. */
  callback: (code: string, state: string, redirectUri: string) =>
    http.post<{ success: boolean; message: string; user: AccountUser }>('/identity/auth/callback', {
      code,
      state,
      redirectUri,
    }),

  /** Current user, or `null` when the cookie session is absent. */
  async me(): Promise<AccountUser | null> {
    const result = await http.get<{ success: boolean; isAuthenticated: boolean; user?: AccountUser }>(
      '/identity/auth/status',
    )
    return result.isAuthenticated && result.user ? result.user : null
  },

  logout: () => http.post<{ success: boolean; message: string; logoutUrl: string | null }>('/identity/auth/logout', {}),
}