// The drop: after her third landing she stands on the last cloud (cloud 4, on the right). The next scroll (state.drop, 0-1) takes her
// straight down out of the cloud scene and into the About Me section. Like the rest of the dream there is no clock: the frame is a pure
// function of the scroll progress, so stopping freezes her mid-fall, scrolling up runs it backwards, and after the end nothing moves.
//
// Timeline (progress d, 0-1):
//   0.00 - 0.12  A  TAKE-OFF   stand (end.webp) -> push-off (jump11.webp); a small hop up from cloud 4, then she lets go
//   0.12 - 0.38  C  FALL       jump11 -> jump22 (upright fall): the clouds stream up and away behind her
//   0.38 - 0.72  C  FASTER     jump22 -> jump33 (faster fall, dress and hijab flung up), motion lines at their longest
//   0.72 - 1.00  D  SETTLE     the fall eases off and jump33 relaxes into jump22: her stable final pose
// The clouds (cloud 4 and the rest) slide up out of the frame while a plain background rises from the bottom through a soft edge and
// covers the sky; she stays on the right the whole time (her x never leaves cloud 4's x), only her height and a little depth-scale change.
//
// Poses are cross-dissolved, each at its own scale, all on the same face point (as jump.ts), so her head never slides across her face.

import jump11Url from '@/assets/meadow/jump11.webp'
import jump22Url from '@/assets/meadow/jump22.webp'
import jump33Url from '@/assets/meadow/jump33.webp'
import { JUMP_POSES } from './jump'
import { createTris } from './tris'

/** the About Me section's plain background: the canvas veil and the section below it both use this */
export const ABOUT_BG: [number, number, number] = [248, 245, 238]
export const ABOUT_BG_CSS = `rgb(${ABOUT_BG.join(',')})`

export const DROP_CONFIG = {
  /** extra scroll length for the drop, in viewport heights */
  scrollVh: 300,
  /** key pictures in order (indexes into DROP_POSES): stand, push-off, upright fall, faster fall, upright fall */
  sequence: [0, 1, 2, 3, 2],
  keyTimes: [0, 0.12, 0.38, 0.72, 1],
  /** the hop off the cloud, as a fraction of her height, and the span of d it takes */
  hop: { height: 0.05, span: [0.03, 0.15] as [number, number] },
  /** how far the clouds travel up out of the frame (viewport heights) over [start, end] of d */
  world: { rise: 1.2, span: [0.05, 0.8] as [number, number] },
  /** the plain background's soft leading edge: its height (viewport heights) and the span of d it sweeps up over */
  veil: { band: 0.35, span: [0.15, 0.88] as [number, number] },
  /** where her face ends up (fraction of the viewport height) and how much bigger than on the cloud she may grow (depth) */
  rest: { y: 0.4, height: 0.52 },
  /** how much bigger than on the cloud she may grow with depth */
  grow: 1.7,
  /** the closest she may come to the right edge (fraction of the viewport width) and the furthest left (so she is always on the right) */
  edge: 0.02,
  minX: 0.66,
  /** tiny secondary motion: roll (radians) and bob (fraction of her height) */
  sway: { roll: 0.022, bob: 0.006 },
}

/** the pictures, in their own px: `face` is her face point and `scale` is the picture's size relative to the standing picture */
export const DROP_POSES = [
  JUMP_POSES[0],
  { key: 'take-off', url: jump11Url, w: 241, h: 389, face: [118, 63], feet: [118, 380], scale: 1.25 },
  { key: 'fall', url: jump22Url, w: 310, h: 499, face: [158, 90], feet: [158, 490], scale: 1.05 },
  { key: 'fast', url: jump33Url, w: 467, h: 751, face: [237, 172], feet: [237, 740], scale: 0.8 },
]

/** the fine lines: where each starts around her (picture px of jump33, from the face), outward x, speed and length (her heights) */
const LINES = [
  // hands
  { ox: -190, oy: -10, v: 1.0, len: 0.30, a: 0.9 }, { ox: 205, oy: 15, v: 1.15, len: 0.34, a: 0.9 },
  { ox: -230, oy: -60, v: 0.8, len: 0.22, a: 0.6 }, { ox: 245, oy: -30, v: 0.9, len: 0.24, a: 0.6 },
  // sleeves
  { ox: -215, oy: 90, v: 1.05, len: 0.26, a: 0.7 }, { ox: 225, oy: 120, v: 0.95, len: 0.28, a: 0.7 },
  // hijab tails
  { ox: -85, oy: -170, v: 1.2, len: 0.24, a: 0.8 }, { ox: 140, oy: -150, v: 1.1, len: 0.27, a: 0.8 },
  // dress edges
  { ox: -200, oy: 250, v: 1.1, len: 0.32, a: 0.8 }, { ox: 190, oy: 265, v: 1.0, len: 0.3, a: 0.8 },
  { ox: -150, oy: 380, v: 0.85, len: 0.22, a: 0.55 }, { ox: 145, oy: 395, v: 0.9, len: 0.25, a: 0.55 },
]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (t * -2 + 3) }
const ease = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }

export interface DropFrame {
  /** how far the clouds have slid up (viewport px, negative = up) */
  worldDy: number
  /** the plain background's leading edge (viewport px: transparent here) and its band height (opaque below edge + band) */
  veilEdge: number
  veilBand: number
  /** where her face is (viewport px), the standing picture's size on screen, a roll about her face (radians) */
  face: [number, number]
  base: number
  roll: number
  /** the two key pictures being blended (indexes into DROP_POSES) and how far (0-1) */
  from: number
  to: number
  mix: number
  /** 0-1: how strongly the motion lines show, how far they have travelled (in line lengths) and 0-1 how far the sky is covered */
  speed: number
  travel: number
  cover: number
}

/** how much of the sky streaming (the fall's wind streaks and near wisps) is left at drop progress d: it is gone before the plain background arrives */
export const dropSkyKeep = (d: number) => 1 - smooth(0, 0.35, d)

/**
 * The drop's frame for progress d (0-1). `spot` is where she stands on cloud 4 (viewport px, feet) and `base` her size there;
 * `vw`, `vh` the viewport. Pure and stateless.
 */
export function dropAt(d: number, spot: [number, number], base: number, vw: number, vh: number): DropFrame {
  const C = DROP_CONFIG
  d = clamp(d, 0, 1)

  // which pictures: the key times, each transition eased
  const T = C.keyTimes
  let q = 0
  for (let i = 0; i < T.length - 1; i++) q += ease(T[i], T[i + 1], d)
  const k = clamp(Math.floor(q), 0, T.length - 2)
  const from = C.sequence[k], to = C.sequence[k + 1], mix = clamp(q - k, 0, 1)

  // her size: the standing size grows with depth, up to a cap that keeps the fast picture comfortably inside the frame
  const fast = DROP_POSES[3]
  const fit = (C.rest.height * vh) / (fast.h * fast.scale)
  const endBase = Math.max(base, Math.min(base * C.grow, fit))
  const b = lerp(base, endBase, ease(0.08, 0.75, d))

  // the face point: from above her feet on the cloud down to its resting height, always on cloud 4's x (clamped to the right of the screen)
  const stand = DROP_POSES[0]
  const startFace: [number, number] = [spot[0] + (stand.face[0] - stand.feet[0]) * stand.scale * base, spot[1] + (stand.face[1] - stand.feet[1]) * stand.scale * base]
  const halfW = (fast.w * 0.5 + 10) * fast.scale * endBase
  const x = clamp(startFace[0], vw * C.minX, vw * (1 - C.edge) - halfW)
  const hop = -C.hop.height * stand.h * base * Math.sin(Math.PI * clamp((d - C.hop.span[0]) / (C.hop.span[1] - C.hop.span[0]), 0, 1))
  const y = lerp(startFace[1], vh * C.rest.y, ease(0.1, 0.78, d)) + hop

  // fall speed: nothing while she crouches off the cloud, fastest in the middle, easing off as she settles
  const speed = smooth(0.1, 0.42, d) * (1 - 0.85 * smooth(0.78, 1, d))
  const travel = 3.2 * ease(0.06, 1, d)
  const swayEnv = smooth(0.12, 0.35, d) * (1 - smooth(0.85, 1, d))
  const roll = C.sway.roll * Math.sin(travel * 5.1) * swayEnv
  const bob = C.sway.bob * stand.h * b * Math.sin(travel * 7.3 + 1) * swayEnv

  const worldDy = -C.world.rise * vh * ease(C.world.span[0], C.world.span[1], d)
  const veilBand = C.veil.band * vh
  const sweep = ease(C.veil.span[0], C.veil.span[1], d)
  const veilEdge = lerp(vh, -veilBand, sweep)

  return { worldDy, veilEdge, veilBand, face: [x, y + bob], base: b, roll, from, to, mix, speed, travel, cover: smooth(0.15, 0.88, d) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDrop(p: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let imgs: any[] | null = null
  let disposed = false
  const tris = createTris(p)

  async function load() {
    const out = await Promise.all(DROP_POSES.map((P) => p.loadImage(P.url)))
    if (!disposed) imgs = out
  }

  /**
   * The plain background rising over the sky. `toCam` maps a screen y to the camera space she is drawn in (the camera's zoom/pan),
   * so the edge sits where the frame says on screen. Opaque below edge + band; the band eases from clear to opaque.
   */
  function drawVeil(f: DropFrame, vw: number, vh: number, toCam: (y: number) => number) {
    if (f.veilEdge >= vh) return
    const [r, g, b] = ABOUT_BG
    const x0 = -vw, x1 = vw * 2
    const steps = 8
    p.noStroke()
    tris.begin()
    const quad = (ya: number, yb: number, aa: number, ab: number) => {
      const A = [r, g, b, 255 * aa], B = [r, g, b, 255 * ab]
      for (const [x, y, c] of [[x0, ya, A], [x1, ya, A], [x0, yb, B], [x1, ya, A], [x1, yb, B], [x0, yb, B]] as const) tris.vertex(x, y, c[0], c[1], c[2], c[3])
    }
    for (let i = 0; i < steps; i++) {
      const a = i / steps, c = (i + 1) / steps
      quad(toCam(f.veilEdge + f.veilBand * a), toCam(f.veilEdge + f.veilBand * c), smooth(0, 1, a), smooth(0, 1, c))
    }
    // solid beyond the band, down past the bottom of the frame
    quad(toCam(f.veilEdge + f.veilBand), toCam(vh * 3), 1, 1)
    tris.end()
  }

  /** fine lines flowing up past her hands, sleeves, hijab tails and dress edges: behind her, never over her face */
  function drawLines(f: DropFrame, base: number) {
    if (f.speed < 0.02) return
    const P = DROP_POSES[3]
    const sc = P.scale * base, H = P.h * sc, R = H * 1.6
    const mixC = smooth(0.35, 0.9, f.cover)
    const col = [lerp(238, 120, mixC), lerp(246, 145, mixC), lerp(255, 175, mixC)]
    p.noStroke()
    tris.begin()
    LINES.forEach((L, i) => {
      const raw = (i * 0.37 + f.travel * L.v) % 1
      const rho = raw - Math.floor(raw)
      // each line rises relative to her and wraps; it fades in and out so nothing pops
      const env = Math.sin(Math.PI * rho)
      const a = L.a * f.speed * 0.95 * env * env
      if (a < 0.01) return
      const len = H * L.len * (0.55 + 0.75 * f.speed)
      // a little past her outline, widening a hair as the fall speeds up
      const out = 1 + 0.06 * f.speed
      const cx = f.face[0] + L.ox * sc * out, cy = f.face[1] + L.oy * sc + R / 2 - rho * R
      const hw = Math.max(0.6, base * 2.2) * (0.6 + 0.5 * f.speed)
      const hi = [col[0], col[1], col[2], 255 * a], lo = [col[0], col[1], col[2], 0]
      // a tapered ribbon: opaque at its lower (leading) end, fading to nothing above
      for (const [x, y, c] of [[cx - hw, cy, hi], [cx + hw, cy, hi], [cx, cy - len, lo], [cx - hw, cy, hi], [cx + hw, cy, hi], [cx, cy + len * 0.15, lo]] as const) tris.vertex(x, y, c[0], c[1], c[2], c[3])
    })
    tris.end()
  }

  /** draws her for frame f: every picture on the same face point, rolled a touch about it */
  function draw(f: DropFrame) {
    if (!imgs) return
    const MO = { fadeIn: [0, 0.7], fadeOut: [0.6, 1] }
    p.push()
    p.noStroke()
    p.translate(f.face[0], f.face[1])
    p.rotate(f.roll)
    const layer = (i: number, a: number) => {
      if (a <= 0.003) return
      const P = DROP_POSES[i], sc = P.scale * f.base
      p.tint(255, 255 * a)
      p.image(imgs![i], -P.face[0] * sc, -P.face[1] * sc, P.w * sc, P.h * sc)
    }
    // the old picture stays whole under the next as it fades in, then fades out so none of it is left hanging
    if (f.mix < 0.999) layer(f.from, 1 - smooth(MO.fadeOut[0], MO.fadeOut[1], f.mix))
    if (f.mix > 0.001) layer(f.to, smooth(MO.fadeIn[0], MO.fadeIn[1], f.mix))
    p.noTint()
    p.pop()
  }

  return { load, draw, drawLines, drawVeil, get ready() { return !!imgs }, dispose() { disposed = true; tris.dispose() } }
}
