// Waking up: the dream run backwards. Once she has settled on the About Me page, the scroll carries the same liquid wave back across the
// frame (the dust shader of the first dream, in meadow.ts), but this time it breaks the About Me page apart and reveals the meadow again,
// closed in on her sleeping face. Then she opens her eyes and the camera pulls back out to the whole meadow, as it was at the top of the page.
// Like the rest of the dream it has no clock: everything is a pure function of the scroll progress (state.wake, 0-1).
//
// Timeline (progress u, 0-1):
//   0.00 - WAVE_END   the wave crosses, About Me -> the meadow, zoomed in on her closed eyes
//   OPEN_AT           she opens her eyes (they open in real time, as they close in the hero)
//   ZOOM_FROM - 1     the camera zooms out to the full meadow

export const WAKE_CONFIG = {
  /** extra scroll length, in viewport heights */
  scrollVh: 420,
  /** the wave crosses over [0, waveEnd] of the progress */
  waveEnd: 0.4,
  /** she opens her eyes here, and the zoom-out runs from zoomFrom to the end */
  openAt: 0.48,
  zoomFrom: 0.52,
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** the wave's own 0-1 position (the dream's `t`) */
export const wakeWave = (u: number) => clamp(u / WAKE_CONFIG.waveEnd, 0, 1)

/** how closed in the camera is (1 = on her face, 0 = the whole meadow) */
export function wakeZoom(u: number) {
  const k = clamp((u - WAKE_CONFIG.zoomFrom) / (1 - WAKE_CONFIG.zoomFrom), 0, 1)
  return 1 - k * k * (3 - 2 * k)
}
