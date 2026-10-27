// The things she has taken off, put back on: click her glasses on the grass and they rise, open in the air and settle on her
// face, the lenses over her eyes; click her hat and it floats over and comes to rest on her face, covering it, as if she had
// tipped it over her eyes for a nap. Click her face and the last one on comes off and lands back where it lay.
//
// Each animation is a pure function of one number, `u` (0 = on the grass, 1 = on her face), which playWear runs on the
// clock; the meadow (meadow.ts) reads it each frame, the way it reads the bag reveal (bagItems.ts).

import { GLASSES_PLACE, HAT_PLACE } from './props'

export interface WearConfig {
  /** where it lies on the grass (scene px, radians) */
  from: { x: number; y: number; rot: number }
  /** where it sits on her face (scene px, radians), and how big (1 = as on the grass) */
  to: { x: number; y: number; rot: number; scale: number }
  /** seconds to rise off the grass and settle on her face, and to come back off it */
  on: number
  off: number
  /** how high it arcs above the straight line between the two places (scene px) */
  arc: number
  /** the extra turn it takes in the air (radians), gone by the time it lands */
  spin: number
  /** how much bigger it looks at the top of its arc, nearer the camera */
  swell: number
}

// Where the glasses sit, in scene px: centred between her pupils (on girl.webp at (739, 154) and (808, 187), carried through
// meadow.ts' girlPixels / girlToScene), along the line through them, and sized so the lens centres are on the pupils (the open
// glasses' lenses are 14.6 apart, her pupils 16.9); then lowered half a px, so the pupils sit just above the lens centres
const EYES = { x: 386.4, y: 307.1, rot: 0.344, scale: 1.16 }
export const GLASSES_WEAR: WearConfig = {
  from: GLASSES_PLACE,
  to: { ...EYES, x: EYES.x - Math.sin(EYES.rot) * 0.5 * EYES.scale, y: EYES.y + Math.cos(EYES.rot) * 0.5 * EYES.scale },
  on: 1.1,
  off: 0.9,
  arc: 34,
  spin: 0.35,
  swell: 0.22,
}

// The hat, crown up, over her whole face: centred on it (just below her eyes, so the brim reaches from her hairline past her
// chin) and big enough to hide the face under it
export const HAT_WEAR: WearConfig = {
  from: HAT_PLACE,
  to: { x: 386, y: 307, rot: -0.35, scale: 1.2 },
  on: 1.2,
  off: 1,
  arc: 26,
  spin: -0.5,
  swell: 0.16,
}

export interface WearState {
  /** 0 = on the grass, 1 = on her face */
  u: number
  /** 1 while the pointer is over it on the grass (the meadow eases its little lift towards it) */
  hover: number
  /** true while it is on its way (its hotspot is off meanwhile) */
  moving: boolean
}

export const createWear = (): WearState => ({ u: 0, hover: 0, moving: false })

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Moves it onto her face (`on`) or back onto the grass, on the clock. Returns a function that stops it where it is. */
export function playWear(w: WearState, cfg: WearConfig, on: boolean, reduced: boolean, onDone: () => void) {
  const from = w.u, to = on ? 1 : 0
  const dur = (on ? cfg.on : cfg.off) * Math.abs(to - from)
  w.hover = 0
  if (reduced || dur <= 0) {
    w.u = to
    onDone()
    return () => {}
  }
  w.moving = true
  const t0 = performance.now()
  let id = 0, stopped = false
  const tick = () => {
    if (stopped) return
    const k = clamp((performance.now() - t0) / 1000 / dur, 0, 1)
    w.u = from + (to - from) * k
    if (k >= 1) {
      w.moving = false
      onDone()
    } else id = requestAnimationFrame(tick)
  }
  id = requestAnimationFrame(tick)
  return () => {
    stopped = true
    w.moving = false
    cancelAnimationFrame(id)
  }
}

/**
 * Where it is `u` of the way to her face: its centre and turn (scene px, rad), its size (1 = as on the grass), how far open it
 * is (0..1: the glasses fade from their folded picture into the worn one), how high it floats above whatever is under it
 * (0..1, for its shadow) and how far it has settled on her face (0..1, the shadow turns from the grass's green to a soft shade
 * on her skin).
 */
export function wearPose(cfg: WearConfig, u: number) {
  const e = easeInOutCubic(clamp(u, 0, 1))
  const A = cfg.from, B = cfg.to
  // a quadratic arc up off the grass and down onto her face
  const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2 - cfg.arc
  const m = 1 - e
  const x = m * m * A.x + 2 * m * e * cx + e * e * B.x
  const y = m * m * A.y + 2 * m * e * cy + e * e * B.y
  const float = Math.sin(Math.PI * e)
  const rot = A.rot + (B.rot - A.rot) * e + cfg.spin * float
  const scale = 1 + (B.scale - 1) * e + cfg.swell * float
  return { x, y, rot, scale, open: smooth(0.2, 0.62, e), float, worn: smooth(0.7, 1, e) }
}
