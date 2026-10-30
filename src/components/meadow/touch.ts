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
import { DROP_POSES, ABOUT_BG } from './drop'
import type { DropFrame } from './drop'
import { createTris } from './tris'

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
export function touchAt(u: number, df: DropFrame, surfaceCam: number, rightEdge: number, vh: number, reduced = false, remembered = 0): TouchFrame {
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
  const feet = lerp(feet0, surfaceY, a * a)
  const surface = lerp(surfaceY + C.rise * vh, surfaceY, easeOut(a))

  // the impact: squash and a tiny hop on the rebound, then it is gone
  const tau = Math.max(0, u - uc)
  const press = impactSpring(tau) * k
  const I = C.impact
  const squash = 1 - I.squash * press
  const spread = 1 + I.spread * press
  const hop = I.hop * vh * Math.max(0, -press)
  const contactY = u < uc ? feet : surfaceY - hop

  // her seated size, a little closer as she settles; and her x easing to where her whole seated body fits on the screen
  const grow = 1 + C.grow * smooth(C.growSpan[0], C.growSpan[1], u)
  const seat = TOUCH_POSES[1]
  // land1's dress reaches 305 px right of her face
  const reach = 305 * seat.scale * base * (1 + C.grow)
  const seatX = Math.min(face0[0], rightEdge - reach)
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
  const tris = createTris(p)

  async function load() {
    // the falling picture is already loaded by drop.ts (the browser caches it); only the three landing pictures are new
    const out = await Promise.all(TOUCH_POSES.map((P) => p.loadImage(P.url)))
    if (!disposed) imgs = out
  }

  /** the surface: a soft hand-drawn line with a faint warm shade fading away below it (it is gone before the bottom of the frame) */
  function drawSurface(f: TouchFrame, vw: number, vh: number) {
    if (f.surface <= 0.003 || f.surfaceY > vh * 2) return
    const [r, g, b] = ABOUT_BG
    const shade = [lerp(r, 214, 0.9), lerp(g, 203, 0.9), lerp(b, 180, 0.9)]
    const x0 = -vw * 0.2, x1 = vw * 1.2, cols = 64, rows = 6, band = vh * 0.15
    const wob = (x: number) => (Math.sin(x * 0.011 + 1.3) * 1.6 + Math.sin(x * 0.031) * 0.9) * (vh / 900)
    p.noStroke()
    tris.begin()
    const put = (x: number, y: number, alpha: number) => tris.vertex(x, y, shade[0], shade[1], shade[2], 255 * alpha)
    for (let c = 0; c < cols; c++) {
      const xa = lerp(x0, x1, c / cols), xb = lerp(x0, x1, (c + 1) / cols)
      for (let i = 0; i < rows; i++) {
        const ta = i / rows, tb = (i + 1) / rows
        const ya = f.surfaceY + wob(xa) + band * ta * ta, yb = f.surfaceY + wob(xa) + band * tb * tb
        const yc = f.surfaceY + wob(xb) + band * ta * ta, yd = f.surfaceY + wob(xb) + band * tb * tb
        const aa = 0.34 * (1 - ta) * (1 - ta) * f.surface, ab = 0.34 * (1 - tb) * (1 - tb) * f.surface
        put(xa, ya, aa); put(xb, yc, aa); put(xa, yb, ab)
        put(xb, yc, aa); put(xb, yd, ab); put(xa, yb, ab)
      }
    }
    tris.end()
    // the line itself: thin, a little darker at the top of the shade, only where the wobble puts it
    const hairline = 0.5 * f.surface
    tris.begin()
    for (let c = 0; c < cols; c++) {
      const xa = lerp(x0, x1, c / cols), xb = lerp(x0, x1, (c + 1) / cols)
      const ya = f.surfaceY + wob(xa), yb = f.surfaceY + wob(xb), th = Math.max(1, vh / 600)
      const col = [188, 174, 150]
      for (const [x, y] of [[xa, ya], [xb, yb], [xa, ya + th], [xb, yb], [xb, yb + th], [xa, ya + th]] as const) {
        tris.vertex(x, y, col[0], col[1], col[2], 255 * hairline)
      }
    }
    tris.end()
  }

  /** her soft contact shadow, on the surface under her */
  function drawShadow(f: TouchFrame, vh: number) {
    if (f.shadow <= 0.003) return
    const P = TOUCH_POSES[1], w = P.w * P.scale * f.base * 0.66
    p.noStroke()
    for (let i = 0; i < 5; i++) {
      const t = i / 4
      p.fill(120, 100, 70, 255 * 0.07 * f.shadow)
      p.ellipse(f.x + w * 0.05, f.surfaceY + vh * 0.004, w * (1 - 0.5 * t), vh * 0.032 * (1 - 0.4 * t))
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

  return { load, draw, drawSurface, drawShadow, get ready() { return !!imgs }, dispose() { disposed = true; tris.dispose() } }
}
