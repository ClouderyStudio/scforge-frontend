/**
 * Markdown 渲染与纯文本摘要。
 *
 * 正文在服务端保持原样存储，渲染全在前端完成：
 *   marked 负责 GFM（标题 / 列表 / 表格 / 代码块 / 引用 / 任务列表…），
 *   DOMPurify 负责净化 —— 用户内容一律不可信，必须过一道白名单再进 v-html。
 * 链接统一加 target=_blank + rel=noopener，避免 reverse tabnabbing。
 */
import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

let hooked = false

function ensureHooks(): void {
  if (hooked) return
  hooked = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer nofollow')
    }
  })
}

/** 渲染 Markdown 为可安全用于 v-html 的 HTML。 */
export function renderMarkdown(source: string | null | undefined): string {
  const text = (source ?? '').trim()
  if (!text) return ''
  ensureHooks()
  const raw = marked.parse(text, { async: false }) as string
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    // 图片只允许 http(s) 与站内相对路径：data: 之类不给过。
    ALLOWED_URI_REGEXP: /^(?:https?:|\/|mailto:|#)/i,
  })
}

/** 去掉标记后的纯文本摘要，用于列表、meta 描述等场景。 */
export function markdownExcerpt(source: string | null | undefined, limit = 160): string {
  const flat = (source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return flat.length > limit ? flat.slice(0, limit) + '…' : flat
}
