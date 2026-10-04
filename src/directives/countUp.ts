/**
 * v-count-up — animates the leading integer in an element's text content, so
 * "20+" counts up from 0 once it scrolls into view. Under reduced motion the
 * count is simply quicker rather than absent.
 */
import type { Directive } from 'vue'

const observers = new WeakMap<HTMLElement, IntersectionObserver>()
const frames = new WeakMap<HTMLElement, number>()

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export const vCountUp: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    const raw = (el.textContent ?? '').trim()
    const match = /\d+/.exec(raw)
    if (!match || match.index === undefined) return

    const target = Number(match[0])
    const prefix = raw.slice(0, match.index)
    const suffix = raw.slice(match.index + match[0].length)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = binding.value ?? (reduced ? 700 : 1400)

    el.textContent = prefix + '0' + suffix

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          observer.unobserve(entry.target)

          const start = performance.now()
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1)
            el.textContent = prefix + Math.round(target * easeOutCubic(t)) + suffix
            if (t < 1) frames.set(el, requestAnimationFrame(tick))
            else frames.delete(el)
          }
          frames.set(el, requestAnimationFrame(tick))
        }
      },
      { threshold: 0.4 },
    )

    observer.observe(el)
    observers.set(el, observer)
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
    const frame = frames.get(el)
    if (frame) cancelAnimationFrame(frame)
  },
}
