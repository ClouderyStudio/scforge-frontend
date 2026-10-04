/**
 * v-reveal — MD3-styled scroll reveal.
 *
 * Adds .md-reveal (defined in base.css) and toggles .is-revealed once the
 * element arrives in the viewport. Accepts a delay in ms or an options object.
 *
 * Reliability: the observer uses threshold 0, so any sliver of the element
 * counts (a ratio threshold silently strands elements taller than the window —
 * e.g. the projects grid on a phone). A scroll/resize sweep then guarantees the
 * last elements on the page arrive too, where a bottom rootMargin could
 * otherwise leave them below the reachable scroll position forever.
 */
import type { Directive } from 'vue'

interface RevealOptions {
  /** Transition delay in ms, for staggering grids. */
  delay?: number
  /** Start blurred and sharpen into place. */
  blur?: boolean
  /** Reveal only the first time (default) or every time it enters view. */
  once?: boolean
  /** Starting vertical offset in px (defaults to the stylesheet value). */
  y?: number
  /** Starting scale (defaults to the stylesheet value). */
  scale?: number
}

const observers = new WeakMap<HTMLElement, IntersectionObserver>()
const waiting = new Set<HTMLElement>()
/** How far above the viewport bottom an element counts as comfortably arrived. */
const EDGE = 64
let queued = false
let timer = 0

function stopListening(): void {
  window.clearTimeout(timer)
  window.removeEventListener('scroll', scheduleSweep)
  window.removeEventListener('resize', scheduleSweep)
}

function sweep(): void {
  queued = false
  const vh = window.innerHeight
  const atEnd = window.scrollY + vh >= document.documentElement.scrollHeight - 1
  const limit = atEnd ? vh : vh - EDGE

  waiting.forEach((el) => {
    const rect = el.getBoundingClientRect()
    if (rect.bottom > 0 && rect.top < limit) {
      el.classList.add('is-revealed')
      waiting.delete(el)
    }
  })

  if (waiting.size === 0) stopListening()
}

/** Immediate check — used once per mount, on the next frame. */
function queueSweep(): void {
  if (queued) return
  queued = true
  requestAnimationFrame(sweep)
}

/** Debounced check for scrolling: the observer does the normal work, so this
 *  only has to catch the elements it can never report. */
function scheduleSweep(): void {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (waiting.size === 0) {
      stopListening()
      return
    }
    queueSweep()
  }, 120)
}

export const vReveal: Directive<HTMLElement, RevealOptions | number | undefined> = {
  mounted(el, binding) {
    const value = binding.value
    const options: RevealOptions = typeof value === 'number' ? { delay: value } : (value ?? {})

    el.classList.add('md-reveal')
    if (options.blur) el.classList.add('md-reveal--blur')
    if (options.delay) el.style.transitionDelay = options.delay + 'ms'
    if (options.y !== undefined) el.style.setProperty('--md-reveal-y', options.y + 'px')
    if (options.scale !== undefined) el.style.setProperty('--md-reveal-scale', String(options.scale))

    if (typeof IntersectionObserver === 'undefined' || typeof window === 'undefined') {
      el.classList.add('is-revealed')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            waiting.delete(entry.target as HTMLElement)
            if (options.once !== false) observer.unobserve(entry.target)
          } else if (options.once === false) {
            entry.target.classList.remove('is-revealed')
          }
        }
      },
      { threshold: 0, rootMargin: `0px 0px -${EDGE}px 0px` },
    )

    observer.observe(el)
    observers.set(el, observer)
    waiting.add(el)
    window.addEventListener('scroll', scheduleSweep, { passive: true })
    window.addEventListener('resize', scheduleSweep)
    queueSweep()
  },
  unmounted(el) {
    waiting.delete(el)
    observers.get(el)?.disconnect()
    observers.delete(el)
  },
}
