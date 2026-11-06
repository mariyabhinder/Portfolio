// The touchdown: after the drop she is falling upright, on the right, over the plain About Me background. The next scroll (state.touch, 0-1)
// carries her the rest of the way down onto the About Me surface, she lands, settles into a seated, confused pose and stays there.
// Like the rest of the dream there is no clock: the frame is a pure function of the scroll progress,
// so stopping freezes her, scrolling up runs it backwards, and nothing is integrated frame to frame.
//
// Timeline (progress u, 0-1):
//   0.00 - 0.36  DESCEND   she keeps falling, upright (jump22.webp); the surface rises from below to meet her feet, she speeds up a little
//   0.36         CONTACT   feet meet the surface
//   0.36 - 0.42  LAND      jump22 -> land1 (initial landing pose); the body squashes and springs back (a damped spring, in closed form)
//   0.50 - 0.68  SETTLE    land1 -> land2 (seated, confused, hand at her head); she comes a little closer
//   0.72 - 1.00  REST      stable. The dizzy effects and the bubble (GirlFx.tsx) are DOM, driven by the anchor this file returns.
//
// All pictures are placed by the same two points, so nothing slides or passes through the surface: x on her face, y on the lowest point
// of her dress/shoes ("contact"), which sits on the surface line from the moment of contact on.

import land1Url from '@/assets/meadow/land1.webp'
import land2Url from '@/assets/meadow/land2.webp'
import land3Url from '@/assets/meadow/land3.webp'
import { DROP_POSES } from './drop'
import { mulberry, blob, stroke, bleed, paper, css } from './cloud'
import type { DropFrame } from './drop'

/** how far into the grass she lands, as a fraction of the viewport height */
const LAWN_SINK = 0.055

export const TOUCH_CONFIG = {
  /** extra scroll length for the touchdown, in viewport heights (the last part of it is the pinned rest) */
  scrollVh: 280,
  /** progress at which her feet meet the surface */
  contact: 0.36,
  /** where the surface is, as a fraction of the viewport height (screen), and how far below the viewport it starts out */
  surface: 0.84,
  rise: 0.5,
  /** the picture dissolves: [start, end] of u */
  toLand1: [0.36, 0.42] as [number, number],
  toLand2: [0.5, 0.68] as [number, number],
  /** the seated size relative to the falling picture (same face size), and how much closer she comes while settling */
  seatScale: 0.535,
  grow: 0.18,
  growSpan: [0.5, 0.85] as [number, number],
  /** impact: the spring's period and damping (in u), squash and spread of the body at the first peak, rebound hop (viewport heights) */
  impact: { period: 0.11, damping: 0.3, squash: 0.045, spread: 0.03, hop: 0.006 },
  /** the fall's wind lines: how strong they get on the way down (the drop leaves them at 0.15) */
  lines: { peak: 0.4, fadeOut: [0.28, 0.37] as [number, number] },
  /** the fraction to which reduced motion shrinks the squash, spread and hop */
  reducedMotion: 0.3,
}

/** every picture in its own px: `face` is where her face is, `contact` the y of her lowest point, `head` the top of her hijab (y) and its width */
export const TOUCH_POSES = [
  { ...DROP_POSES[2], contact: 484, head: [55, 85] as [number, number] },
  { key: 'land1', url: land1Url, w: 578, h: 674, face: [240, 188], contact: 618, scale: 1.05 * 0.535, head: [112, 150] as [number, number] },
  { key: 'land2', url: land2Url, w: 429, h: 644, face: [188, 168], contact: 602, scale: 1.05 * 0.535, head: [90, 150] as [number, number] },
  // land3: once she remembers who she is (the word game is solved) she sits the same way, calm, hand on her heart
  { key: 'land3', url: land3Url, w: 459, h: 689, face: [203, 168], contact: 640, scale: 1.05 * 0.535, head: [88, 170] as [number, number] },
]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const easeOut = (x: number) => 1 - (1 - clamp(x, 0, 1)) * (1 - clamp(x, 0, 1))

/** a damped spring's response to a hit at 0: up to 1 at the first peak, then back past 0 and so on (as in land.ts) */
function springShape(period: number, zeta: number) {
  const w = (2 * Math.PI) / period, wd = w * Math.sqrt(1 - zeta * zeta)
  const peakT = Math.atan2(wd, zeta * w) / wd
  const norm = Math.exp(-zeta * w * peakT) * Math.sin(wd * peakT)
  return (tau: number) => (tau <= 0 ? 0 : Math.exp(-zeta * w * tau) * Math.sin(wd * tau) / norm)
}
const impactSpring = springShape(TOUCH_CONFIG.impact.period, TOUCH_CONFIG.impact.damping)

export interface TouchLayer {
  /** index into TOUCH_POSES and its opacity */
  pose: number
  alpha: number
}

export interface TouchFrame {
  /** where her face line and her contact point are (camera px), and the picture scale (per pose, before its own `scale`) with the body's squash and spread */
  x: number
  contactY: number
  base: number
  squash: number
  spread: number
  /** the surface line (camera px), how much of it is up, and how dark her contact shadow is (0-1) */
  surfaceY: number
  surface: number
  shadow: number
  /** the pictures to draw, bottom first */
  layers: TouchLayer[]
  /** the wind lines: strength, extra distance travelled, and the frame to draw them for (her falling body) */
  speed: number
  travel: number
  fallFace: [number, number]
  /** where her head is (camera px): the face point, the top of her hijab, and the hijab's width: for the dizzy effects and the bubble */
  face: [number, number]
  headTop: number
  headW: number
  /** 0-1: she has landed (dizzy effects fade in), she has settled (the bubble may show) */
  landed: number
  seated: number
}

/**
 * The touchdown frame for progress u (0-1). `df` is the drop's last frame, `surfaceCam` where the
 * surface line goes (camera px), `rightEdge` the furthest right her seated body may reach (camera px). Pure and stateless.
 */
export function touchAt(u: number, df: DropFrame, surfaceCam: number, rightEdge: number, vh: number, reduced = false, remembered = 0, portrait = false): TouchFrame {
  const C = TOUCH_CONFIG
  u = clamp(u, 0, 1)
  const k = reduced ? C.reducedMotion : 1
  const uc = C.contact
  const base = df.base
  const fall = TOUCH_POSES[0]
  const fsc = fall.scale * base

  // the falling picture starts exactly where the drop left it; its feet are the contact point
  const face0 = df.face
  const feet0 = face0[1] + (fall.contact - fall.face[1]) * fsc
  // the surface is where the page says, but never so close that she has no distance left to fall
  const surfaceY = Math.max(surfaceCam, feet0 + 0.1 * vh)
  // she picks up a little speed on the way down (ease in), the surface rises to meet her (ease out)
  const a = clamp(u / uc, 0, 1)
  // she lands a little way into the grass, not on its top edge (the blades in front of her, drawFront, hide her feet)
  const sink = LAWN_SINK * vh
  const feet = lerp(feet0, surfaceY + sink, a * a)
  const surface = lerp(surfaceY + C.rise * vh, surfaceY, easeOut(a))

  // the impact: squash and a tiny hop on the rebound, then it is gone
  const tau = Math.max(0, u - uc)
  const press = impactSpring(tau) * k
  const I = C.impact
  const squash = 1 - I.squash * press
  const spread = 1 + I.spread * press
  const hop = I.hop * vh * Math.max(0, -press)
  const contactY = u < uc ? feet : surfaceY + sink - hop

  // her seated size, a little closer as she settles; and her x easing to where her whole seated body fits on the screen
  // on a tall (phone) screen she is a little smaller and sits in the bottom left corner
  // (her widest picture, land1, fills the left 46% of the screen; the decorations take the right half)
  const seat = TOUCH_POSES[1]
  const seatK = portrait ? Math.min(0.78, (0.46 * rightEdge / 0.97) / (seat.w * seat.scale * base * (1 + C.grow))) : 1
  const grow = (1 + C.grow * smooth(C.growSpan[0], C.growSpan[1], u)) * lerp(1, seatK, smooth(0.3, 0.55, u))
  // land1's dress reaches 305 px right of her face
  const reach = 305 * seat.scale * base * (1 + C.grow) * seatK
  const seatX = portrait ? 225 * seat.scale * base * (1 + C.grow) * seatK : Math.min(face0[0], rightEdge - reach)
  const x = lerp(face0[0], seatX, smooth(0.3, 0.55, u))

  // the pictures: each new one fades in over the old, which stays whole under it until the new one is nearly opaque
  const m1 = smooth(C.toLand1[0], C.toLand1[1], u)
  const m2 = smooth(C.toLand2[0], C.toLand2[1], u)
  const layers: TouchLayer[] = [
    // the falling picture is a different shape from the seated ones, so it goes quickly (no ghost of a standing girl is left hanging above her)
    { pose: 0, alpha: 1 - smooth(0.3, 0.7, m1) },
    { pose: 1, alpha: smooth(0, 0.6, m1) * (1 - smooth(0.6, 1, m2)) },
    { pose: 2, alpha: smooth(0, 0.7, m2) * (1 - smooth(0.6, 1, remembered)) },
    { pose: 3, alpha: smooth(0, 0.7, m2) * smooth(0, 0.6, remembered) },
  ]

  // the head follows whichever pictures are showing (their weights, normalised)
  let wSum = 0, fy = 0, ht = 0, hw = 0
  for (const L of layers) {
    if (L.alpha <= 0.001) continue
    const P = TOUCH_POSES[L.pose], g = L.pose === 0 ? 1 : grow
    const sc = P.scale * base * g
    wSum += L.alpha
    fy += L.alpha * (contactY - (P.contact - P.face[1]) * sc * squash)
    ht += L.alpha * (contactY - (P.contact - P.head[0]) * sc * squash)
    hw += L.alpha * P.head[1] * sc * spread
  }
  const faceY = wSum ? fy / wSum : face0[1]

  // the wind lines: a little stronger as she speeds up, gone by contact
  const speed = (df.speed + (C.lines.peak - df.speed) * smooth(0, 0.3, u)) * (1 - smooth(C.lines.fadeOut[0], C.lines.fadeOut[1], u))
  return {
    x, contactY, base: base * grow, squash, spread,
    surfaceY: surface, surface: smooth(0, 0.25, u),
    shadow: smooth(0.1, uc, u),
    layers,
    speed, travel: df.travel + 2.2 * a,
    fallFace: [x, feet - (fall.contact - fall.face[1]) * fsc],
    face: [x, faceY],
    headTop: wSum ? ht / wSum : faceY,
    headW: wSum ? hw / wSum : 0,
    landed: smooth(uc + 0.04, uc + 0.12, u),
    seated: smooth(0.72, 0.8, u),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTouch(p: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let imgs: any[] | null = null
  let disposed = false

  async function load() {
    // the falling picture is already loaded by drop.ts (the browser caches it); only the three landing pictures are new
    const out = await Promise.all(TOUCH_POSES.map((P) => p.loadImage(P.url)))
    if (!disposed) imgs = out
  }

  // the lawn under the line, kept between frames: it only moves up and down with the surface. It is painted in watercolour, the way the
  // falling scene's clouds are (cloud.ts): soft wobbly washes laid back to front, pale light on the upper left of each, loose sideways
  // strokes through them, then bled together and given the paper's grain. The grass is rounded and quiet (no blades), with small soft
  // daisies. Its top edge is a rolling crest scalloped with little mounds.
  let lawnKey = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lawnImg: { img: any; w: number; h: number; front: any; fh: number; pad: number } | null = null
  function lawnFor(vw: number, vh: number, x0: number, x1: number) {
    const key = `${Math.round(vw)}x${Math.round(vh)}`
    if (lawnImg && key === lawnKey) return lawnImg
    lawnKey = key
    lawnImg?.img.remove?.()
    lawnImg?.front.remove?.()
    const s = vh / 900, W = x1 - x0, H = vh * 0.4, PAD = 40 * s, DEEPEST = vh * 0.22
    const K = Math.min(1.5, 4096 / W)
    // the crest of the meadow: long gentle swells, never a straight line (y relative to the line, down is positive)
    const ridge = (x: number) => (Math.sin(x * 0.0042 + 0.8) * 9 + Math.sin(x * 0.0113 + 2.1) * 5 + Math.sin(x * 0.027 + 4) * 1.6) * s
    const canvasOf = (h: number) => {
      const c = document.createElement('canvas')
      c.width = Math.ceil(W * K)
      c.height = Math.ceil((h + PAD) * K)
      const ctx = c.getContext('2d')!
      ctx.scale(K, K)
      ctx.translate(0, PAD)
      return { c, ctx }
    }
    const toImage = (c: HTMLCanvasElement) => {
      const im = p.createImage(c.width, c.height)
      im.loadPixels()
      im.pixels.set(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
      im.updatePixels()
      return im
    }
    const mixc = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    // soft, close greens (the washes of a gouache-and-water meadow), shaded toward blue-green in the deep and light toward the upper left
    const PALE = [186, 216, 142], LIGHT = [160, 203, 124], MID = [134, 184, 108], DEEP = [106, 160, 92], SHADE = [88, 142, 88]
    const rand = mulberry(11)
    const wash = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, d: number) => {
      const t = rand()
      const col = mixc(t < 0.5 ? LIGHT : MID, t < 0.5 ? MID : DEEP, rand() * 0.8 + d * 0.3)
      blob(g, x, y, rx, ry, col, 0.55 + rand() * 0.25, rand, 0.2)
      // the light catching its upper left, like the cloud puffs
      blob(g, x - rx * 0.22, y - ry * 0.3, rx * 0.6, ry * 0.5, PALE, 0.3 + rand() * 0.2, rand, 0.25)
    }
    const daisy = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      const rot = rand() * 6.28
      for (let q = 0; q < 5; q++) {
        const a = rot + (q * Math.PI * 2) / 5
        blob(g, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.4, [252, 252, 248], 0.9, rand, 0.2)
      }
      blob(g, x, y, r * 0.3, r * 0.28, [244, 186, 70], 0.95, rand, 0.15)
    }

    // a prettier flower, painted like the clouds: a thin stem and leaves, a ring of soft petals (each a shaded wash with a paler one over it
    // toward the light), a second smaller ring, a bright dab of light and a warm heart with a few specks
    const PETALS = [[246, 152, 178], [242, 138, 122], [186, 162, 232], [252, 214, 112], [250, 196, 210], [168, 190, 244]]
    const flower = (g: CanvasRenderingContext2D, x: number, y: number, r: number, h: number) => {
      const lean = (rand() - 0.5) * 5 * s, hx = x + lean, hy = y - h
      stroke(g, x + lean / 2, y - h / 2, h, 1.5 * s, -Math.PI / 2 + lean * 0.01, [92, 146, 82], 0.85)
      blob(g, x + 3.2 * s, y - h * 0.38, 3.4 * s, 1.4 * s, [112, 166, 92], 0.85, rand, 0.2)
      blob(g, x - 3 * s, y - h * 0.22, 3 * s, 1.3 * s, [100, 154, 86], 0.85, rand, 0.2)
      const col = PETALS[Math.floor(rand() * PETALS.length)]
      const shade = mixc(col, [150, 110, 170], 0.3), lit = mixc(col, [255, 255, 255], 0.45)
      const rot = rand() * 6.28
      for (let q = 0; q < 6; q++) {
        const a = rot + (q * Math.PI * 2) / 6
        const px = hx + Math.cos(a) * r * 0.62, py = hy + Math.sin(a) * r * 0.5
        blob(g, px, py, r * 0.52, r * 0.46, shade, 0.85, rand, 0.2)
        blob(g, px - r * 0.07, py - r * 0.1, r * 0.4, r * 0.34, col, 0.9, rand, 0.2)
      }
      for (let q = 0; q < 5; q++) {
        const a = rot + 0.5 + (q * Math.PI * 2) / 5
        blob(g, hx + Math.cos(a) * r * 0.32, hy + Math.sin(a) * r * 0.27, r * 0.34, r * 0.3, lit, 0.8, rand, 0.2)
      }
      blob(g, hx - r * 0.22, hy - r * 0.3, r * 0.3, r * 0.2, [255, 255, 255], 0.4, rand, 0.25)
      blob(g, hx, hy, r * 0.24, r * 0.22, [244, 182, 66], 0.95, rand, 0.15)
      for (let q = 0; q < 3; q++) blob(g, hx + (rand() - 0.5) * r * 0.3, hy + (rand() - 0.5) * r * 0.26, r * 0.06, r * 0.06, [200, 120, 40], 0.7, rand, 0.1)
    }

    // ---- the lawn behind her ----
    const { c: cv, ctx: g } = canvasOf(H)
    const ground = g.createLinearGradient(0, -PAD, 0, H)
    ground.addColorStop(0, css(LIGHT, 1))
    ground.addColorStop(0.5, css(MID, 1))
    ground.addColorStop(1, css(DEEP, 1))
    g.beginPath()
    g.moveTo(0, H)
    for (let x = 0; x <= W; x += 6) g.lineTo(x, ridge(x))
    g.lineTo(W, H)
    g.closePath()
    g.fillStyle = ground
    g.fill()
    // washes back to front, each row over the one behind it, bigger toward the viewer
    for (let y = -2 * s, row = 0; y < H; y += 6 * s, row++) {
      const d = Math.min(1, Math.max(0, y / DEEPEST)), sc = 0.75 + 0.8 * d
      for (let k = 0, n = Math.round(W / (62 * s)); k < n; k++) {
        const x = rand() * W
        wash(g, x, y + ridge(x) + (rand() - 0.5) * 5 * s, (22 + rand() * 38) * s * sc, (4.5 + rand() * 6) * s * sc, d)
      }
      // loose strokes lying sideways through the washes
      for (let k = 0, n = Math.round(W / (90 * s)); k < n; k++) {
        const x = rand() * W, light = rand() < 0.55
        stroke(g, x, y + ridge(x), (20 + rand() * 40) * s * sc, (2 + rand() * 2.5) * s * sc, (rand() - 0.5) * 0.18, light ? PALE : SHADE, 0.16 + rand() * 0.2)
      }
      // buttercup dabs and daisies, in loose drifts
      for (let k = 0, n = Math.round(W / (80 * s)); k < n; k++) {
        const x = rand() * W
        blob(g, x, y + ridge(x) + (rand() - 0.5) * 6 * s, (1.2 + rand() * 0.8) * s * sc, (1.3 + rand() * 0.8) * s * sc, [232, 196, 84], 0.7, rand, 0.2)
      }
      for (let k = 0, n = Math.round((W / (110 * s)) * (0.7 + d * 0.6)); k < n; k++) {
        const cx = rand() * W, m = rand() < 0.3 ? 2 + Math.floor(rand() * 2) : 1
        for (let j = 0; j < m; j++) {
          const x = cx + (rand() - 0.5) * 22 * s * sc
          daisy(g, x, y + ridge(x) + (rand() - 0.5) * 7 * s, (2.2 + rand() * 1.2) * s * sc)
        }
      }
      for (let k = 0, n = Math.round((W / (230 * s)) * (0.7 + d * 0.6)); k < n; k++) {
        const x = rand() * W, m = rand() < 0.35 ? 2 : 1
        for (let j = 0; j < m; j++) {
          const fx = x + j * (9 + rand() * 6) * s * sc
          flower(g, fx, y + ridge(fx) + (rand() - 0.5) * 5 * s, (3.6 + rand() * 2) * s * sc, (11 + rand() * 12) * s * sc)
        }
      }
    }
    // the crest: little rounded mounds along the edge, so the hill is scalloped and soft and not a ruled line
    for (let x = 0; x < W; x += (14 + rand() * 20) * s) {
      const r = (10 + rand() * 16) * s
      wash(g, x, ridge(x) - r * 0.08, r, r * (0.28 + rand() * 0.14), 0)
    }
    const body = bleed(cv, Math.max(1.4, 1.5 * s * K), 0.35)
    paper(body, rand, body.width * 0.012, Math.max(2, body.width * 0.0016))

    // ---- the front: soft low mounds over her feet and hem, so she sits in the grass ----
    const FH = vh * 0.2
    const { c: fc, ctx: fg } = canvasOf(FH)
    const base = LAWN_SINK * vh
    for (let j = 0; j < 2; j++) {
      for (let x = rand() * 8 * s; x < W; x += (12 + rand() * 16) * s) {
        const r = (13 + rand() * 14) * s
        wash(fg, x, base + j * 7 * s + ridge(x) * 0.6 + (rand() - 0.5) * 3 * s, r, r * (0.3 + rand() * 0.14), 0.15 + j * 0.35)
      }
    }
    for (let x = 80 * s; x < W; x += (260 + rand() * 260) * s) flower(fg, x, base + (9 + rand() * 8) * s + ridge(x) * 0.6, (4 + rand() * 1.5) * s, (13 + rand() * 8) * s)
    for (let x = 30 * s; x < W; x += (130 + rand() * 170) * s) daisy(fg, x, base + (7 + rand() * 11) * s + ridge(x) * 0.6, (2.8 + rand() * 1.4) * s)
    const front = bleed(fc, Math.max(1.2, 1.2 * s * K), 0.4)
    paper(front, rand, front.width * 0.012, Math.max(2, front.width * 0.0016))
    return (lawnImg = { img: toImage(body), w: W, h: H, front: toImage(front), fh: FH, pad: PAD })
  }

  /** the surface: the lawn she lands on, its rolling edge is the line. It rises into place with f.surface */
  function drawSurface(f: TouchFrame, vw: number, vh: number) {
    if (f.surface <= 0.003 || f.surfaceY > vh * 2) return
    const lawn = lawnFor(vw, vh, -vw * 0.2, vw * 1.2)
    p.tint(255, 255 * f.surface)
    p.image(lawn.img, -vw * 0.2, f.surfaceY - lawn.pad, lawn.w, lawn.h + lawn.pad)
    p.noTint()
  }

  /** the tufts in front of her feet and hem, drawn after her. Only round her (fading out to both sides), so the decorations on the right stay clear of it */
  function drawFront(f: TouchFrame, vw: number, vh: number) {
    if (f.surface <= 0.003 || f.surfaceY > vh * 2 || !lawnImg) return
    const P = TOUCH_POSES[1], sc = P.scale * f.base, s = vh / 900
    const x0 = -vw * 0.2, fade = 70 * s, step = 10
    const left = f.x - P.face[0] * sc * f.spread - 20 * s, right = f.x + (P.w - P.face[0]) * sc * f.spread + 20 * s
    const k = lawnImg.front.width / lawnImg.w, y = f.surfaceY - lawnImg.pad, h = lawnImg.fh + lawnImg.pad
    for (let x = left - fade; x < right + fade; x += step) {
      const a = Math.min(1, (x - (left - fade)) / fade, (right + fade - x) / fade) * f.surface
      if (a <= 0.003) continue
      p.tint(255, 255 * a)
      p.image(lawnImg.front, x, y, step + 0.5, h, (x - x0) * k, 0, (step + 0.5) * k, lawnImg.front.height)
    }
    p.noTint()
  }

  /** her soft contact shadow, on the surface under her */
  function drawShadow(f: TouchFrame, vh: number) {
    if (f.shadow <= 0.003) return
    const P = TOUCH_POSES[1], w = P.w * P.scale * f.base * 0.66
    p.noStroke()
    for (let i = 0; i < 5; i++) {
      const t = i / 4
      p.fill(36, 70, 34, 255 * 0.09 * f.shadow)
      p.ellipse(f.x + w * 0.05, f.surfaceY + (LAWN_SINK + 0.004) * vh, w * (1 - 0.5 * t), vh * 0.032 * (1 - 0.4 * t))
    }
  }

  /** draws her for frame f: every picture on the same face x and contact y */
  function draw(f: TouchFrame) {
    if (!imgs) return
    p.push()
    p.noStroke()
    for (const L of f.layers) {
      if (L.alpha <= 0.003) continue
      const P = TOUCH_POSES[L.pose]
      const sc = P.scale * f.base
      p.push()
      p.translate(f.x, f.contactY)
      p.scale(sc * f.spread, sc * f.squash)
      p.tint(255, 255 * L.alpha)
      p.image(imgs[L.pose], -P.face[0], -P.contact, P.w, P.h)
      p.pop()
    }
    p.noTint()
    p.pop()
  }

  return { load, draw, drawSurface, drawFront, drawShadow, get ready() { return !!imgs }, dispose() { disposed = true } }
}
