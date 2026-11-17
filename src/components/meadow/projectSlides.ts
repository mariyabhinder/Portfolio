// The window's opening shows the two project pages in turn, and like the rest of the dream the scroll alone decides which: Picstory
// is revealed as the shutters open; once they are fully open the window holds still for SLIDES_CONFIG.scrollVh of scroll while Nudge
// swipes in over it from the right, and Nudge stays until the window is carried away. Scroll back up and Picstory slides back in.
// The canvas and the click-through link read the same progress (state.slide), so they always agree.
export const SLIDES_CONFIG = {
  /** extra scroll length, in viewport heights, added where the shutters have finished opening: the window holds open over it */
  scrollVh: 150,
  /** the swipe from Picstory to Nudge, as [start, end] of that scroll (0-1): Picstory is held before it, Nudge after */
  swipe: [0.35, 0.65] as [number, number],
}
export const SLIDE_HREFS = ['#/picstory', '#/nudge']
export const NUDGE_TEAL = '#14b8a6'

const ease = (t: number) => t * t * (3 - 2 * t)

/** At slide progress u (state.slide, 0-1): `from` is the page on show, `to` the one swiping in, `s` how far the swipe has gone (0 = at rest on `from`). */
export function slideAt(u: number) {
  const [a, b] = SLIDES_CONFIG.swipe
  const s = ease(Math.max(0, Math.min(1, (u - a) / (b - a))))
  // the link follows whichever page is mostly in view
  return { from: 0, to: 1, s, current: s < 0.5 ? 0 : 1 }
}
