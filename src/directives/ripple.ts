/**
 * v-ripple — MD3 ripple that expands from the pointer and clips to the host shape.
 *
 * Adds the .md-ripple-host class (position: relative + overflow: hidden) so it can be
 * applied to any element, including ones whose radius comes from other classes.
 */
import type { Directive } from 'vue'

interface RippleHost extends HTMLElement {
  __mdRippleHandler?: (event: PointerEvent) => void
}

function isDisabled(el: HTMLElement): boolean {
  return (
    el.hasAttribute('disabled') ||
    el.getAttribute('aria-disabled') === 'true' ||
    el.classList.contains('md-disabled')
  )
}

function spawnRipple(el: RippleHost, event: PointerEvent): void {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const size = Math.max(rect.width, rect.height) * 2
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const ripple = document.createElement('span')
  ripple.className = 'md-ripple'
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${x - size / 2}px`
  ripple.style.top = `${y - size / 2}px`
  ripple.addEventListener('animationend', () => ripple.remove())
  // Guard against the animation never firing (reduced motion / hidden tab).
  window.setTimeout(() => ripple.remove(), 1000)
  el.appendChild(ripple)
}

export const vRipple: Directive<RippleHost> = {
  mounted(el) {
    el.classList.add('md-ripple-host')
    const handler = (event: PointerEvent) => {
      if (isDisabled(el)) return
      spawnRipple(el, event)
    }
    el.__mdRippleHandler = handler
    el.addEventListener('pointerdown', handler)
  },
  unmounted(el) {
    if (el.__mdRippleHandler) {
      el.removeEventListener('pointerdown', el.__mdRippleHandler)
      delete el.__mdRippleHandler
    }
  },
}
