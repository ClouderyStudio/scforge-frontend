import { onBeforeUnmount, watch, type Ref } from 'vue'

/** Elements that can take focus inside a modal panel. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let lockCount = 0
let previousOverflow = ''

/** Reference-counted body scroll lock so nested modals behave. */
function lockScroll(): void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

function unlockScroll(): void {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.body.style.overflow = previousOverflow
}

export interface UseModalOptions {
  /** Called when the user presses Escape or clicks the scrim. */
  onClose: () => void
  /** Keep the panel mounted; skip restoring focus to the trigger. */
  restoreFocus?: boolean
}

export interface ModalControls {
  /** Move focus to the first focusable element inside the panel. */
  focusFirst: () => void
}

/**
 * Shared behaviour for M3 dialogs and sheets: scroll lock, a focus trap that keeps Tab
 * inside the panel, Escape-to-close, and focus restoration to the invoking element.
 */
export function useModal(
  isOpen: Ref<boolean>,
  panelRef: Ref<HTMLElement | null>,
  options: UseModalOptions,
): ModalControls {
  let restoreTarget: HTMLElement | null = null

  function focusableItems(): HTMLElement[] {
    const root = panelRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
    )
  }

  function focusFirst(): void {
    const items = focusableItems()
    const target = items[0] ?? panelRef.value
    target?.focus({ preventScroll: true })
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      options.onClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = focusableItems()
    if (items.length === 0) {
      event.preventDefault()
      panelRef.value?.focus({ preventScroll: true })
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement as HTMLElement | null
    const inside = active !== null && panelRef.value?.contains(active) === true
    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && inside && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    isOpen,
    (open) => {
      if (open) {
        restoreTarget = (document.activeElement as HTMLElement | null) ?? null
        lockScroll()
        document.addEventListener('keydown', onKeydown, true)
        requestAnimationFrame(() => requestAnimationFrame(focusFirst))
      } else {
        unlockScroll()
        document.removeEventListener('keydown', onKeydown, true)
        if (options.restoreFocus !== false && restoreTarget?.isConnected) {
          restoreTarget.focus({ preventScroll: true })
        }
        restoreTarget = null
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (isOpen.value) {
      unlockScroll()
      document.removeEventListener('keydown', onKeydown, true)
    }
  })

  return { focusFirst }
}
