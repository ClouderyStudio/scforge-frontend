/** Casdoor session endpoints (ClouderyApi Modules/Identity). */
import { http } from './http'
import type { AccountUser, CasdoorConfig } from './types'

export const authApi = {
  /** Casdoor metadata plus this API's callback URI. */
  config: () => http.get<{ success: boolean } & CasdoorConfig>('/identity/auth/config'),

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

  logout: () => http.post<{ success: boolean; message: string; casdoorLogoutUrl: string }>('/identity/auth/logout', {}),
}
