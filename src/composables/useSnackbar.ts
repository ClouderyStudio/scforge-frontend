/**
 * Global snackbar queue.
 *
 * A single M3-styled host (ScSnackbarHost) renders the current message, so any
 * component can report success or failure without threading props.
 */
import { readonly, ref } from 'vue'

export type SnackbarTone = 'neutral' | 'success' | 'error'

export interface SnackbarMessage {
  id: number
  text: string
  tone: SnackbarTone
  timeout: number
}

const current = ref<SnackbarMessage | null>(null)
let nextId = 1
let timer = 0

function hide(): void {
  window.clearTimeout(timer)
  current.value = null
}

function show(text: string, tone: SnackbarTone = 'neutral', timeout = 4000): void {
  window.clearTimeout(timer)
  current.value = { id: nextId++, text, tone, timeout }
  if (timeout > 0) timer = window.setTimeout(hide, timeout)
}

export function useSnackbar() {
  return {
    message: readonly(current),
    hide,
    show,
    success: (text: string) => show(text, 'success'),
    error: (text: string) => show(text, 'error', 6000),
  }
}
