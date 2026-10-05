/**
 * Thin fetch wrapper for the ClouderyApi backend.
 *
 * The session lives in an HttpOnly Casdoor cookie, so every request sends
 * `credentials: 'include'` — there is no token for the frontend to hold.
 */
import type { ApiErrorBody } from './types'

/** API origin. Empty by default: dev goes through the Vite proxy, prod is same-origin. */
const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** FormData skips the JSON content type and is sent as-is. */
  form?: FormData
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /** Extra request headers (e.g. the privacy unlock token). */
  headers?: Record<string, string>
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = BASE + path
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? url + (url.includes('?') ? '&' : '?') + qs : url
}

async function parseError(response: Response): Promise<never> {
  let message = `请求失败（HTTP ${response.status}）`
  try {
    const text = await response.text()
    if (text) {
      try {
        const body = JSON.parse(text) as ApiErrorBody
        if (body.detail || body.message) message = body.detail || body.message!
      } catch {
        if (text.length < 200) message = text
      }
    }
  } catch {
    /* keep the status-based message */
  }
  if (response.status === 401) message = '登录状态已失效，请重新登录'
  throw new ApiError(response.status, message)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', ...options.headers },
    signal: options.signal,
  }
  if (options.form) {
    init.body = options.form
  } else if (options.body !== undefined) {
    init.headers = { ...(init.headers as Record<string, string>), 'Content-Type': 'application/json' }
    init.body = JSON.stringify(options.body)
  }

  const response = await fetch(buildUrl(path, options.query), init)
  if (!response.ok) await parseError(response)
  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const http = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal, headers?: Record<string, string>) =>
    request<T>(path, { query, signal, headers }),
  /** `query` 用于需要把参数放地址栏的 POST（如后台按 userId 签发）。 */
  post: <T>(path: string, body?: unknown, query?: RequestOptions['query'], headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, query, headers }),
  put: <T>(path: string, body?: unknown, query?: RequestOptions['query'], headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body, query, headers }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: 'PATCH', body, headers }),
  del: <T>(path: string, body?: unknown, query?: RequestOptions['query'], headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', body, query, headers }),
  /** multipart 上传；`method` 用于 PUT 形式的编辑端点（默认 POST）。 */
  upload: <T>(path: string, form: FormData, signal?: AbortSignal, method: string = 'POST') =>
    request<T>(path, { method, form, signal }),
}

/**
 * 隐私插件的解锁令牌。
 *
 * 存在 sessionStorage 而非 localStorage：关掉标签页即失效，
 * 共享电脑上下一个人不会自动继承访问权。令牌本身是自签名的短期凭据，
 * 过期就重新输口令。
 */
const ACCESS_TOKEN_KEY = 'scforge.accessToken'

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    // 隐私模式 / 存储被禁用：退化成每次都重新输口令，功能仍可用。
    return null
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
    else sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    /* 存储不可用时静默降级 */
  }
}

/** 带解锁令牌的请求头；没有令牌时返回空对象，服务端按未解锁处理。 */
export function accessHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { 'X-Scforge-Access': token } : {}
}

/** Absolute URL for an API-relative path (used by download links and images). */
export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return BASE + path
}

export { BASE as apiBase }
