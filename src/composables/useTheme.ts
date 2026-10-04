import { computed, ref, watch } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'scforge-theme'

const preference = ref<ThemePreference>('system')
const systemDark = ref(false)
let initialized = false

function resolveDark(): boolean {
  if (preference.value === 'system') return systemDark.value
  return preference.value === 'dark'
}

const isDark = computed(() => resolveDark())

let transitionTimer = 0

/**
 * Reflect the resolved scheme on <html>. `animate` wraps the change in
 * .md-theme-transition (see styles/motion.css) so every themed surface
 * cross-fades instead of snapping; the first paint deliberately skips it.
 */
function apply(animate = true): void {
  const root = document.documentElement

  if (animate) {
    root.classList.add('md-theme-transition')
    window.clearTimeout(transitionTimer)
    transitionTimer = window.setTimeout(() => {
      root.classList.remove('md-theme-transition')
    }, 400)
  }

  root.classList.toggle('dark', isDark.value)
  root.style.colorScheme = isDark.value ? 'dark' : 'light'
}

/** Initialise once: read the stored preference and follow the OS setting. */
export function initTheme(): void {
  if (initialized) return
  initialized = true

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    preference.value = stored
  }

  const query = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = query.matches
  query.addEventListener('change', (event) => {
    systemDark.value = event.matches
    apply()
  })

  apply(false)
}

export function useTheme() {
  function setPreference(value: ThemePreference): void {
    preference.value = value
    localStorage.setItem(STORAGE_KEY, value)
    apply()
  }

  function toggle(): void {
    setPreference(isDark.value ? 'light' : 'dark')
  }

  watch(isDark, () => apply())

  return { preference, isDark, setPreference, toggle }
}
