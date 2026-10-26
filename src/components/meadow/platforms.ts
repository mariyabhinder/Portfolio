// The platforms: three more clouds that materialise one by one, down and to the right of the girl's cloud, as it recedes toward
// the top-left. Together with her cloud they form a diagonal staircase for the jumping scene that follows.
//
// Like the rest of the dream there is no clock: each cloud's opacity, scale and rise are pure functions of the recede's scroll
// progress (state.recede, 0-1), so stopping freezes them and scrolling up un-reveals them in reverse order.
//
// The clouds are the same procedural cloud as hers (cloud.ts: same palette, lighting and softness), painted with their own seed
// and shape parameters and no dent. They are in screen space and independent of the girl group's recede transform. Each has a
// stable id so the next scene can address it as a landing platform (`platformCentre` gives its final centre on screen).

import { paintCloud } from './cloud'

export interface PlatformSpec {
  /** stable id for the jumping scene */
  id: string
  /** final centre as a fraction of the viewport (0,0 = top-left) */
  at: [number, number]
  /** drawn width of the cloud sprite as a fraction of the viewport width (the visible cloud is ~0.72 of it) */
  size: number
  /** recede progress (0-1) at which the reveal starts and ends */
  reveal: [number, number]
  /** shape variation: the paint seed, how far the heap spreads, the blue shade, and a flip so no two lobes line up */
  seed: number
  spread: number
  shade: number
  flip: boolean
}

export const PLATFORM_CONFIG = {
  /** sprite canvas size (px) the clouds are painted on: smaller than hers, they are seen from further away */
  px: [900, 506] as [number, number],
  /** scale at the start of a reveal (grows to 1, no overshoot) */
  fromScale: 0.9,
  /** how far a cloud settles upward into place (fraction of the viewport height) */
  rise: 0.018,
  /** the closest a cloud's edge may come to the viewport edge (fraction of the shorter side) */
  margin: 0.02,
  /** how far a landing flattens a cloud (fraction of its height at full press) */
  press: 0.07,
  /** the three new clouds, top-left to bottom-right (cloud 1 is hers, see recede.ts for its end position) */
  clouds: [
    { id: 'cloud-2', at: [0.4, 0.37], size: 0.34, reveal: [0.5, 0.7], seed: 211, spread: 1.0, shade: 0.9, flip: false },
    { id: 'cloud-3', at: [0.62, 0.59], size: 0.31, reveal: [0.66, 0.86], seed: 347, spread: 0.96, shade: 0.95, flip: true },
    { id: 'cloud-4', at: [0.82, 0.8], size: 0.29, reveal: [0.8, 1.0], seed: 463, spread: 1.04, shade: 1.0, flip: false },
  ] as PlatformSpec[],
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const ease = (x: number) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }

export interface PlatformFrame {
  id: string
  /** on-screen centre (px), drawn size (px) with the reveal's scale applied, opacity 0-1 */
  x: number
  y: number
  w: number
  h: number
  alpha: number
}

/** a platform's final, fully revealed centre (viewport px), for the jumping scene */
export function platformCentre(i: number, vw: number, vh: number): [number, number] {
  const f = platformsAt(1, vw, vh)[i]
  return [f.x, f.y]
}

/** every platform's frame for recede progress r. Pure and stateless. */
export function platformsAt(r: number, vw: number, vh: number): PlatformFrame[] {
  const C = PLATFORM_CONFIG
  const aspect = C.px[1] / C.px[0]
  const m = C.margin * Math.min(vw, vh)
  return C.clouds.map((c) => {
    const e = ease((r - c.reveal[0]) / (c.reveal[1] - c.reveal[0]))
    const fw = c.size * vw, fh = fw * aspect
    // keep the visible cloud (~0.72 x 0.62 of the sprite) inside the viewport at its final place
    const hx = fw * 0.36, hy = fh * 0.31
    const x = clamp(c.at[0] * vw, m + hx, vw - m - hx)
    const y = clamp(c.at[1] * vh, m + hy, vh - m - hy) + (1 - e) * C.rise * vh
    const s = C.fromScale + (1 - C.fromScale) * e
    return { id: c.id, x, y, w: fw * s, h: fh * s, alpha: e }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPlatforms(p: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let imgs: any[] | null = null
  let disposed = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageFromCanvas = (cv: HTMLCanvasElement, flip: boolean): any => {
    const src = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)
    if (flip) {
      const { width: w, height: h, data } = src
      for (let y = 0; y < h; y++) for (let x = 0; x < (w >> 1); x++) for (let k = 0; k < 4; k++) {
        const a = (y * w + x) * 4 + k, b = (y * w + (w - 1 - x)) * 4 + k
        const t = data[a]; data[a] = data[b]; data[b] = t
      }
    }
    const im = p.createImage(cv.width, cv.height)
    im.loadPixels()
    im.pixels.set(src.data)
    im.updatePixels()
    return im
  }

  /** paints the clouds one per slice, so no single frame takes the whole cost */
  async function load() {
    const C = PLATFORM_CONFIG
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any[] = []
    for (const c of C.clouds) {
      await new Promise<void>((resolve) => setTimeout(() => {
        if (!disposed) {
          const s = paintCloud({ width: C.px[0], height: C.px[1], seed: c.seed, spread: c.spread, shade: c.shade, zone: 0.02, dent: 0, wisps: 0 })
          out.push(imageFromCanvas(s.body, c.flip))
        }
        resolve()
      }, 60))
    }
    if (!disposed) imgs = out
  }

  /** draws the clouds that are at least partly revealed (viewport px; call inside the camera, before the girl's group) */
  function draw(r: number, vw: number, vh: number, press?: number[]) {
    if (!imgs || r <= 0) return
    const frames = platformsAt(r, vw, vh)
    p.push()
    p.noStroke()
    p.imageMode(p.CENTER)
    frames.forEach((f, i) => {
      if (f.alpha <= 0.003) return
      p.tint(255, 255 * f.alpha)
      // a landing presses the cloud: it flattens a hair about its base and spreads, then recovers
      const pr = press?.[i + 1] ?? 0
      if (pr > 0.001) {
        p.push()
        p.translate(f.x, f.y + f.h * 0.25)
        p.scale(1 + 0.5 * PLATFORM_CONFIG.press * pr, 1 - PLATFORM_CONFIG.press * pr)
        p.image(imgs![i], 0, -f.h * 0.25, f.w, f.h)
        p.pop()
      } else p.image(imgs![i], f.x, f.y, f.w, f.h)
    })
    p.noTint()
    p.imageMode(p.CORNER)
    p.pop()
  }

  return { load, draw, get ready() { return !!imgs }, dispose() { disposed = true } }
}
