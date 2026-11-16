import Lenis from 'lenis'

// Smooth page scroll (Lenis). The whole site is one pinned scene driven by window.scrollY, so a mouse wheel's ~100px
// steps show as jumps in the canvas: Lenis eases the wheel into a glide. Touch scrolling is left native (syncTouch off):
// the browser's own momentum is already smooth and costs nothing on low-end phones, where a JS-driven touch scroll lags.
// With reduced motion asked for, the page keeps plain native scrolling.
let lenis: Lenis | null = null
let locks = 0

// Wheel speed by scroll depth: each zone runs until `untilVh` (vh: 1% of the viewport height, like the scene lengths) at `factor` times the normal wheel speed, and
// past the last zone it is normal (1). Each change of speed eases in over the zone's `blendVh` (default BLEND_VH) after its
// `untilVh`, so a part can be lingered over (or hurried through) without a jolt. Zones are in order of depth.
export interface SpeedZone { untilVh: number; factor: number; blendVh?: number }
const BLEND_VH = 60

function speedAt(zones: SpeedZone[], depth: number) {
  let f = zones.length ? zones[0].factor : 1
  for (let i = 0; i < zones.length; i++) {
    const next = i + 1 < zones.length ? zones[i + 1].factor : 1
    const t = Math.min(1, Math.max(0, (depth - zones[i].untilVh) / (zones[i].blendVh ?? BLEND_VH)))
    if (t <= 0) break
    f = f + (next - f) * t
  }
  return f
}

export function startSmoothScroll(zones: SpeedZone[] = []) {
  if (lenis || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  lenis = new Lenis({
    virtualScroll: (data) => {
      if (!zones.length || !data.event.type.includes('wheel')) return true
      // in vh (1 vh = 1% of the viewport height), the same unit as the zones and the scene's own lengths
      const depth = (lenis?.targetScroll ?? window.scrollY) / (window.innerHeight / 100)
      data.deltaY *= speedAt(zones, depth)
      return true
    },
    autoRaf: true,
    smoothWheel: true,
    syncTouch: false,
    lerp: 0.1,
    // the scene is ~4600 vh long: each wheel notch travels further so the story doesn't take endless scrolling
    wheelMultiplier: 1.5,
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
