// The window's opening alternates between two project pages (Picstory, Nudge): each is held for HOLD seconds, then the next swipes in
// over SWIPE seconds, forever. Time alone decides the state, so the canvas and the click-through link always agree.
export const SLIDE_HOLD = 5
export const SLIDE_SWIPE = 0.8
export const SLIDE_HREFS = ['#/picstory', '#/nudge']
export const NUDGE_TEAL = '#14b8a6'

const SLIDE_CYCLE = SLIDE_HOLD + SLIDE_SWIPE
const ease = (t: number) => t * t * (3 - 2 * t)

/** `from` is the page on show, `to` the one swiping in, `s` how far the swipe has gone (0 = at rest on `from`). */
export function slideAt(nowMs: number) {
  const n = SLIDE_HREFS.length
  const t = nowMs / 1000
  const step = Math.floor(t / SLIDE_CYCLE)
  const local = t - step * SLIDE_CYCLE
  const s = local < SLIDE_HOLD ? 0 : ease((local - SLIDE_HOLD) / SLIDE_SWIPE)
  const from = step % n
  const to = (from + 1) % n
  // the link follows whichever page is mostly in view
  const current = s < 0.5 ? from : to
  return { from, to, s, current }
}
