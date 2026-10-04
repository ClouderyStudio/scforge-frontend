import { onBeforeUnmount, onMounted, ref } from 'vue'

/** True once the page has scrolled past the threshold (used by the top app bar). */
export function useScrolled(threshold = 8) {
  const scrolled = ref(false)

  function onScroll(): void {
    scrolled.value = window.scrollY > threshold
  }

  onMounted(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  })

  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

  return { scrolled }
}
