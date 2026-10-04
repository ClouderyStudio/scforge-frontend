/**
 * Authenticated file download.
 *
 * The plugin archive endpoint sits behind the Casdoor cookie session, so a plain
 * `<a href>` would not carry credentials. Fetch the blob, then hand it to a
 * temporary object URL so the browser still shows its normal save flow.
 */
import { apiUrl } from '@/api/http'

export async function downloadFile(url: string, fileName?: string): Promise<void> {
  const response = await fetch(apiUrl(url), { credentials: 'include' })
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
