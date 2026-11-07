/**
 * 全局提示条（MD3 Snackbar）。
 *
 * 实现已上移到组件库的 `useSnackbar()`：提示条本身是站点通用的，
 * 身份中心与 SCForge 都在用同一套；各自维护一份会在时长、色调上分叉。
 *
 * 这个文件保留 `useSnackbar` 这个名字只为不动 22 个页面 / 43 处调用，
 * 并额外兼容旧的 `(text, tone, timeout)` 位置参数写法。
 * **新代码请直接用组件库的 `useSnackbar()`**。
 */
import { useSnackbar as useSharedSnackbar } from '@clderystd/m3-ui'

export type SnackbarTone = 'neutral' | 'success' | 'error' | 'warning'

export function useSnackbar() {
  const snackbar = useSharedSnackbar()

  /**
   * 旧签名 `show(text, tone, timeout)` 与组件库的 `show(text, options)` 并存：
   * 直接透传 options 形式的调用，位置参数形式在调用点逐个改成新写法前先继续工作。
   */
  function show(text: string, toneOrOptions?: SnackbarTone | { tone?: SnackbarTone; title?: string; timeout?: number }, timeout?: number) {
    if (typeof toneOrOptions === 'string') {
      snackbar.show(text, { tone: toneOrOptions, ...(timeout !== undefined ? { timeout } : {}) })
      return
    }
    snackbar.show(text, toneOrOptions ?? {})
  }

  return {
    message: snackbar.current,
    hide: snackbar.hide,
    show,
    success: snackbar.success,
    error: snackbar.error,
    warning: snackbar.warning,
  }
}
