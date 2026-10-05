/**
 * Authenticated file download.
 *
 * The plugin archive endpoint sits behind the Casdoor cookie session, so a plain
 * `<a href>` would not carry credentials. Fetch the blob, then hand it to a
 * temporary object URL so the browser still shows its normal save flow.
 *
 * 隐私插件必须带上解锁令牌：服务端在下载入口会再判一次权限，
 * 光靠详情页解锁是不够的 —— 拿到 versionId 的人可以直接打这个接口。
 */
import { accessHeaders, apiUrl } from '@/api/http'

export async function downloadFile(url: string, fileName?: string): Promise<void> {
  const response = await fetch(apiUrl(url), {
    credentials: 'include',
    headers: accessHeaders(),
  })
  if (!response.ok) {
    throw new Error(`下载失败（HTTP ${response.status}）`)
  }

  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition)
  const name = fileName ?? (match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '')) : 'download')

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a moment to start the save before revoking the URL.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}
