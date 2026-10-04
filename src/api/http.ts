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
        if (body.message) message = body.message
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
    headers: { Accept: 'application/json' },
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
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  /** multipart 上传；`method` 用于 PUT 形式的编辑端点（默认 POST）。 */
  upload: <T>(path: string, form: FormData, signal?: AbortSignal, method: string = 'POST') =>
    request<T>(path, { method, form, signal }),
}

/** Absolute URL for an API-relative path (used by download links and images). */
export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return BASE + path
}

export { BASE as apiBase }
