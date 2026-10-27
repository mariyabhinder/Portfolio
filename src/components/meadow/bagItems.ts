// The bag reveal: click her tote on the grass, the camera closes in on it, the things inside float out one after another,
// hang around the bag for a moment, drop back in one by one, and the camera pulls back to the meadow.
//
// Everything you may want to edit is in BAG_ITEMS (what comes out and where it ends up) and BAG_TIMING (how long each part
// takes) below. The animation itself is a pure function of the clock (bagFrame), which writes a few numbers into BagReveal;
// the meadow (meadow.ts) reads them each frame, so there is no React state and nothing re-renders while it plays.

import item1 from '@/assets/meadow/item1 2.webp'
import item2 from '@/assets/meadow/item2 1.webp'
import item3 from '@/assets/meadow/item3 1.webp'
import item4 from '@/assets/meadow/item4 1.webp'
import item5 from '@/assets/meadow/item5 1.webp'
import item6 from '@/assets/meadow/item6 1.webp'
import { BAG_PLACE } from './props'

export interface BagItemConfig {
  /** the picture: drop the file in src/assets/meadow/ and import it above. Its transparent margins are trimmed, its aspect ratio kept */
  image: string
  /** how tall it is once it is out, in scene px (the bag is 80 tall, so 40 is about half the bag) */
  height: number
  /** where it ends up, in scene px from the centre of the bag: x to the right, y down (so negative y is above the bag) */
  x: number
  y: number
  /** how it is turned once it is out (degrees) */
  rot: number
  /** the trajectory: how high above the straight line from the bag to its place it arcs on the way out (scene px; negative arcs below) */
  arc: number
  /** how it is turned as it leaves the bag (degrees), turning to `rot` on the way */
  startRot: number
  /** seconds added to this item's turn to come out (and, mirrored, to go back in) */
  delay?: number
}

// The painting is 736 x 920 scene px and the camera frames BAG_VIEW (215 x 260) of it around the bag, so keep every item (its
// offset plus half its size) inside +-105 across and +-125 down and it stays on screen on any screen, phones included. Her
// body and hand lie to the bag's right (x > +25 from the bag, above it), so the items fan out to its left, above and below.
export const BAG_ITEMS: BagItemConfig[] = [
  { image: item1, height: 36, x: -80, y: -56, rot: -12, arc: 30, startRot: 40, delay: 0 },
  { image: item2, height: 27, x: -42, y: -92, rot: 8, arc: 26, startRot: -35 },
  { image: item3, height: 28, x: -2, y: -90, rot: 7, arc: 30, startRot: 30 },
  { image: item4, height: 42, x: -88, y: 8, rot: -9, arc: 20, startRot: 55 },
  { image: item5, height: 44, x: -68, y: 68, rot: 14, arc: 18, startRot: -50 },
  { image: item6, height: 46, x: -22, y: 88, rot: -6, arc: 22, startRot: 45 },
]

export const BAG_TIMING = {
  /** the camera closes in on the bag, then the same time to pull back out (s) */
  zoom: 1.2,
  /** the camera's pause before the first item comes out (s) */
  settle: 0.15,
  /** how long each item takes to come out (s) */
  emerge: 0.95,
  /** gap between one item starting to come out and the next (s) */
  emergeGap: 0.32,
  /** how long they all hang around the bag (s) */
  hold: 2.5,
  /** how long each takes to go back in (s), and the gap between one starting and the next: they go back in reverse order */
  back: 0.7,
  backGap: 0.22,
  /** the pause with everything in the bag before the camera pulls back (s) */
  pause: 0.25,
}

/** what the camera frames around the bag at full zoom (scene px): all of it is always on screen, so the bag has room around it on any screen */
const BAG_VIEW = { w: 215, h: 260 }

/** where the animation is, in numbers the meadow reads each frame */
export interface BagReveal {
  /** 0 = the camera is on the meadow as scrolled, 1 = closed in on the bag */
  cam: number
  /** 1 while the pointer is over the bag (the meadow eases its little lift towards it) */
  hover: number
  /** how far out of the bag each item is (0 = inside, 1 = in its place), one per BAG_ITEMS entry */
  items: number[]
}

export const createBagReveal = (): BagReveal => ({ cam: 0, hover: 0, items: BAG_ITEMS.map(() => 0) })

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)

/** the moments of the sequence (s): when each item starts coming out and going back in, and when the camera starts to leave */
function schedule() {
  const T = BAG_TIMING, n = BAG_ITEMS.length
  const out = BAG_ITEMS.map((it, i) => T.zoom + T.settle + i * T.emergeGap + (it.delay ?? 0))
  const outEnd = Math.max(...out) + T.emerge
  const backStart = outEnd + T.hold
  // reverse order: the last item out is the first back in
  const back = BAG_ITEMS.map((it, i) => backStart + (n - 1 - i) * T.backGap + (it.delay ?? 0))
  const backEnd = Math.max(...back) + T.back
  const zoomOut = backEnd + T.pause
  return { out, back, zoomOut, end: zoomOut + T.zoom }
}

export const bagDuration = () => schedule().end

/** sets `bag` to where the sequence is `t` seconds after the click. Returns true once it has finished. With reduced motion the camera cuts and the items fade in place. */
export function bagFrame(bag: BagReveal, t: number, reduced: boolean): boolean {
  const T = BAG_TIMING, s = schedule()
  const zin = clamp(t / T.zoom, 0, 1), zout = clamp((t - s.zoomOut) / T.zoom, 0, 1)
  bag.cam = reduced ? (t > 0 && t < s.zoomOut ? 1 : 0) : easeInOutCubic(zin) * (1 - easeInOutCubic(zout))
  BAG_ITEMS.forEach((_, i) => {
    const going = t < s.back[i]
    bag.items[i] = going ? clamp((t - s.out[i]) / T.emerge, 0, 1) : 1 - clamp((t - s.back[i]) / T.back, 0, 1)
  })
  if (t >= s.end) {
    bag.cam = 0
    bag.items.fill(0)
    return true
  }
  return false
}

/** Plays the sequence on the clock. Returns a function that stops it and puts everything back. */
export function playBagReveal(bag: BagReveal, reduced: boolean, onDone: () => void) {
  const t0 = performance.now()
  let id = 0, stopped = false
  const tick = () => {
    if (stopped) return
    if (bagFrame(bag, (performance.now() - t0) / 1000, reduced)) onDone()
    else id = requestAnimationFrame(tick)
  }
  id = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(id)
    bag.cam = 0
    bag.items.fill(0)
  }
}

/**
 * The camera, as a transform from scene px to viewport px: p.translate(tx, ty); p.scale(s). At k = 0 it is the cover fit the
 * meadow starts in (scale s0, offset ox, oy); at k = 1 it frames BAG_VIEW around the bag (kept inside the painting). In
 * between, the bag slides in a straight line to the middle of the screen while the scale grows steadily, so it reads as one move.
 */
export function bagCamera(vw: number, vh: number, k: number, scene: { w: number; h: number }, s0: number, ox: number, oy: number) {
  const { x: bx, y: by } = BAG_PLACE
  const sB = Math.min(vw / BAG_VIEW.w, vh / BAG_VIEW.h)
  const hw = vw / sB / 2, hh = vh / sB / 2
  const cx = 2 * hw >= scene.w ? scene.w / 2 : clamp(bx, hw, scene.w - hw)
  const cy = 2 * hh >= scene.h ? scene.h / 2 : clamp(by, hh, scene.h - hh)
  const s = s0 * Math.pow(sB / s0, k)
  const px = ox + bx * s0 + (vw / 2 + (bx - cx) * sB - (ox + bx * s0)) * k
  const py = oy + by * s0 + (vh / 2 + (by - cy) * sB - (oy + by * s0)) * k
  return { s, tx: px - bx * s, ty: py - by * s }
}

/** where an item is `u` of the way out (0 = inside the bag, 1 = in its place): offset from the bag's centre (scene px), turn (rad), size (1 = full), opacity, and how high it floats (0..1, for its shadow) */
export function itemPose(it: BagItemConfig, u: number, reduced: boolean) {
  if (reduced) return { x: it.x, y: it.y, rot: (it.rot * Math.PI) / 180, scale: 1, alpha: u, float: u }
  // it starts tucked into the bag's opening, shrunk so that the bag hides all of it, then grows as it comes clear
  const a = BAG_PLACE.rot, d = BAG_PLACE.h * 0.1 // a little below the bag's centre in its own frame: well inside its body
  const start = { x: -Math.sin(a) * d, y: Math.cos(a) * d }
  const e = 1 - Math.pow(1 - u, 2.4)
  const cx = (start.x + it.x) / 2, cy = (start.y + it.y) / 2 - it.arc
  const m = 1 - e
  const x = m * m * start.x + 2 * m * e * cx + e * e * it.x
  const y = m * m * start.y + 2 * m * e * cy + e * e * it.y
  const turn = it.startRot + (it.rot - it.startRot) * e + Math.sin(Math.PI * e) * 10
  return { x, y, rot: (turn * Math.PI) / 180, scale: 0.3 + 0.7 * easeOutBack(clamp(u / 0.75, 0, 1)), alpha: 1, float: Math.sin((Math.PI * e) / 2) }
}
