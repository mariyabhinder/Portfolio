import Lenis from 'lenis'

// Smooth page scroll (Lenis). The whole site is one pinned scene driven by window.scrollY, so a mouse wheel's ~100px
// steps show as jumps in the canvas: Lenis eases the wheel into a glide. Touch scrolling is left native (syncTouch off):
// the browser's own momentum is already smooth and costs nothing on low-end phones, where a JS-driven touch scroll lags.
// With reduced motion asked for, the page keeps plain native scrolling.
let lenis: Lenis | null = null
let locks = 0

export function startSmoothScroll() {
  if (lenis || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  lenis = new Lenis({
    autoRaf: true,
    smoothWheel: true,
    syncTouch: false,
    lerp: 0.1,
    wheelMultiplier: 1,
    // the phone gallery's lists and strips scroll themselves
    allowNestedScroll: true,
  })
  if (locks > 0) lenis.stop()
  return () => {
    lenis?.destroy()
    lenis = null
  }
}

// While something holds the page still (the bag reveal, the hanging ID card), the glide stops at once too
export function lockScroll() {
  locks++
  lenis?.stop()
  let released = false
  return () => {
    if (released) return
    released = true
    locks = Math.max(0, locks - 1)
    if (locks === 0) lenis?.start()
  }
}
