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
import p5 from 'p5'
import { TOUCH_CONFIG } from './touchConfig'
import { mulberry, blob, css } from './cloud'
import type { DropFrame } from './drop'

/** how far into the grass she lands, as a fraction of the viewport height */
const LAWN_SINK = 0.055

export { TOUCH_CONFIG }

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

// ---------- the lawn's grass in the wind (GPU) ----------

/** the breeze over the lawn: the same direction and tempo as the meadow's */
const WIND = { a: 0.22, pace: 0.35 }
const WIND_DIR = [Math.cos(WIND.a), Math.sin(WIND.a)]
/** tip travel in px for a 45 px blade in a full gust, natural sway frequency of a 40 px blade, segments per blade */
const GRASS = { amp: 5, hz: 0.3, seg: 4 }

interface Blade { x: number; y: number; a: number; len: number; bend: number; w: number; col: number[]; h: number; leaf?: boolean; anchor: number }

const saturate = (col: number[], f: number) => {
  const m = (col[0] + col[1] + col[2]) / 3
  return col.map((v) => clamp(m + (v - m) * f, 0, 255))
}

/** a blade (or petal) as a quadratic through its middle, tapering to its tip; a petal is fattest in its middle */
function bladeCurve(b: Blade) {
  const dx = Math.cos(b.a), dy = Math.sin(b.a)
  const p0 = [b.x - (dx * b.len) / 2, b.y - (dy * b.len) / 2], p2 = [b.x + (dx * b.len) / 2, b.y + (dy * b.len) / 2]
  const m = [b.x - dy * b.bend, b.y + dx * b.bend]
  const c = [2 * m[0] - (p0[0] + p2[0]) / 2, 2 * m[1] - (p0[1] + p2[1]) / 2]
  const pts: { x: number; y: number; nx: number; ny: number; hw: number }[] = []
  for (let k = 0; k <= GRASS.seg; k++) {
    const s = k / GRASS.seg, u = 1 - s
    const x = u * u * p0[0] + 2 * s * u * c[0] + s * s * p2[0], y = u * u * p0[1] + 2 * s * u * c[1] + s * s * p2[1]
    const tx = 2 * u * (c[0] - p0[0]) + 2 * s * (p2[0] - c[0]), ty = 2 * u * (c[1] - p0[1]) + 2 * s * (p2[1] - c[1])
    const tl = Math.hypot(tx, ty) || 1
    const prof = b.leaf ? Math.sin(Math.PI * Math.min(Math.max(s, 0.08), 0.92)) : Math.pow(1 - s, 0.9) * Math.min(1, 0.35 + s * 3)
    pts.push({ x, y, nx: -ty / tl, ny: tx / tl, hw: Math.max(0.35, b.w * 0.5 * prof) })
  }
  if (!b.leaf && p2[1] > p0[1]) pts.reverse()
  return pts
}

const NOISE_GLSL = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}`

// Each blade's root is pinned and it bends like a little cantilever, following the wind smoothed over the last second or so; gusts
// arrive in patches carried downwind, and bent blades show their paler sides. uFade (x0, x1, width; width 0 = off) fades the front
// layer out to both sides of her; uAlpha is the surface's own fade.
const GRASS_VERT = `
precision highp float;
attribute vec3 aPosition, aNormal;
attribute vec2 aTexCoord;
attribute vec4 aVertexColor;
uniform mat4 uModelViewMatrix, uProjectionMatrix;
uniform float uTime, uSecs, uPace, uAmp, uHz;
uniform vec2 uWind;
uniform vec3 uFade;
varying vec4 vColor;
varying vec2 vUV;
varying float vBend, vFade;
${NOISE_GLSL}

float gust(float t, vec2 p) {
  float tt = t - dot(p, uWind) / 260.0;
  float n = 0.5 + 0.5 * (0.55 * sin(tt * 0.53 + 1.3) + 0.3 * sin(tt * 1.17 + 0.4) + 0.15 * sin(tt * 2.31 + 2.1));
  return 0.3 + 0.7 * smoothstep(0.32, 0.72, n) + 0.02 * sin(tt * 5.1);
}

float windAt(vec2 p, float t) {
  vec2 side = vec2(-uWind.y, uWind.x);
  float along = dot(p, uWind) - t * 260.0, across = dot(p, side);
  float patch = 0.6 * vnoise(vec2(along / 210.0, across / 110.0)) + 0.4 * vnoise(vec2(along / 90.0, across / 60.0) + 7.3);
  return gust(t, p) * (0.45 + 1.1 * patch);
}

void main() {
  vec2 root = aNormal.xy;
  float len = aNormal.z, t = aPosition.z, seed = aTexCoord.y, h = aVertexColor.a;
  float t0 = uTime - 0.1 * seed * uPace;
  float w = 0.4 * windAt(root, t0) + 0.3 * windAt(root, t0 - 0.5 * uPace) + 0.2 * windAt(root, t0 - 1.0 * uPace) + 0.1 * windAt(root, t0 - 1.5 * uPace);
  float hz = uHz * pow(40.0 / len, 0.3);
  float ph = 1.5 * vnoise(root / 70.0) + 0.15 * seed;
  float sway = (0.2 + 0.8 * w) * sin(6.2832 * (uSecs * hz + ph));
  float twist = (0.2 + 0.8 * w) * sin(6.2832 * (uSecs * hz * 0.7 + ph + 0.3));
  float give = uAmp * (len / 45.0) * mix(0.35, 1.0, h);
  vec2 tip = give * (uWind * ((w - 0.6) + 0.12 * sway) + vec2(-uWind.y, uWind.x) * 0.06 * twist);
  vec2 q = aPosition.xy + tip * t * t;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(q, 0.0, 1.0);
  vColor = aVertexColor;
  vUV = aTexCoord;
  vBend = clamp(w - 0.55, 0.0, 1.0) * mix(0.3, 1.0, h) * t;
  vFade = uFade.z > 0.0 ? clamp(min(root.x - (uFade.x - uFade.z), (uFade.y + uFade.z) - root.x) / uFade.z, 0.0, 1.0) : 1.0;
}`

const GRASS_FRAG = `
precision highp float;
uniform float uAlpha;
varying vec4 vColor;
varying vec2 vUV;
varying float vBend, vFade;
void main() {
  float a = (1.0 - smoothstep(0.8, 1.0, abs(vUV.x))) * uAlpha * vFade;
  vec3 c = vBend > 0.18 ? vColor.rgb * 1.08 + vec3(0.03, 0.04, 0.03) : vColor.rgb;
  gl_FragColor = vec4(c * a, a);
}`

// ---------- the lawn's ground and big flowers (painted once, on the CPU) ----------

/** the lawn's greens: at the crest, in the middle distance, and nearest the viewer */
const LAWN = { top: [104, 156, 98], mid: [70, 122, 84], deep: [44, 92, 70] }

const mixc = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BigFlower { x: number; y: number; R: number; stem: number; spr: any; k: number; flip: boolean }

/** the gust the grass shader uses, on the CPU, for the big flowers' nod (0.3 calm .. 1 full gust) */
function windAtJS(x: number, y: number, secs: number) {
  const tt = secs * WIND.pace - (x * WIND_DIR[0] + y * WIND_DIR[1]) / 260
  const n = 0.5 + 0.5 * (0.55 * Math.sin(tt * 0.53 + 1.3) + 0.3 * Math.sin(tt * 1.17 + 0.4) + 0.15 * Math.sin(tt * 2.31 + 2.1))
  return 0.3 + 0.7 * smooth(0.32, 0.72, n)
}

/**
 * Cel-shades a canvas in place, over its top `rows`: a Kuwahara filter of radius r (each pixel takes the mean of the calmest of its
 * four quadrants, so strokes merge into flat patches with crisp edges), then the luminance cut into steps of 18 and the colour
 * pushed a little. Transparent pixels are filtered as `fill` so the crest does not pick up a dark fringe; alpha is kept.
 */
function celPass(cv: HTMLCanvasElement, r: number, rows: number, fill: number[]) {
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  const W = cv.width, H = Math.min(cv.height, rows), W1 = W + 1
  if (W < 2 || H < 2) return
  const im = ctx.getImageData(0, 0, W, H), P = im.data
  for (let i = 0; i < W * H; i++) if (P[i * 4 + 3] < 255) { P[i * 4] = fill[0]; P[i * 4 + 1] = fill[1]; P[i * 4 + 2] = fill[2] }
  const S = [0, 1, 2].map(() => new Float64Array(W1 * (H + 1))), S2 = new Float64Array(W1 * (H + 1))
  for (let y = 0; y < H; y++) {
    let r0 = 0, r1 = 0, r2 = 0, rl = 0
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, o = (y + 1) * W1 + x + 1
      r0 += P[i]; r1 += P[i + 1]; r2 += P[i + 2]
      S[0][o] = S[0][o - W1] + r0; S[1][o] = S[1][o - W1] + r1; S[2][o] = S[2][o - W1] + r2
      const l = 0.299 * P[i] + 0.587 * P[i + 1] + 0.114 * P[i + 2]
      rl += l * l
      S2[o] = S2[o - W1] + rl
    }
  }
  const box = (A: Float64Array, x0: number, y0: number, x1: number, y1: number) => A[(y1 + 1) * W1 + x1 + 1] - A[y0 * W1 + x1 + 1] - A[(y1 + 1) * W1 + x0] + A[y0 * W1 + x0]
  const step = 18
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = Infinity, m0 = 0, m1 = 0, m2 = 0
    for (let q = 0; q < 4; q++) {
      const x0 = q & 1 ? x : Math.max(0, x - r), x1 = q & 1 ? Math.min(W - 1, x + r) : x
      const y0 = q & 2 ? y : Math.max(0, y - r), y1 = q & 2 ? Math.min(H - 1, y + r) : y
      const cnt = (x1 - x0 + 1) * (y1 - y0 + 1)
      const a = box(S[0], x0, y0, x1, y1) / cnt, b = box(S[1], x0, y0, x1, y1) / cnt, c = box(S[2], x0, y0, x1, y1) / cnt
      const ml = 0.299 * a + 0.587 * b + 0.114 * c, v = box(S2, x0, y0, x1, y1) / cnt - ml * ml
      if (v < best) { best = v; m0 = a; m1 = b; m2 = c }
    }
    const l = Math.max(0.299 * m0 + 0.587 * m1 + 0.114 * m2, 1), target = (Math.floor(l / step) + 0.5) * step
    const col = saturate([m0 * target / l, m1 * target / l, m2 * target / l], 1.15)
    const o = (y * W + x) * 4
    P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]
  }
  ctx.putImageData(im, 0, 0)
}

/**
 * One big flower head, R px in radius, seen a little from above: ragged petals in flat orange bands (lit toward the upper left,
 * shaded below), a deeper ring round a dark brown middle, and a thin darker rim. Painted pixel by pixel so every band edge is crisp.
 */
function paintBigFlower(rand: () => number, R: number) {
  const M = Math.ceil(R * 0.08) + 2, N = 2 * (R + M)
  const cv = document.createElement('canvas')
  cv.width = cv.height = N
  const ctx = cv.getContext('2d')!
  const im = ctx.createImageData(N, N), P = im.data
  const n = 5 + Math.floor(rand() * 2), rot = rand() * 6.28, sq = 0.8 + rand() * 0.15
  const ph = Array.from({ length: 6 }, () => rand() * 6.28)
  const ox = (rand() - 0.5) * 0.14, oy = (rand() - 0.5) * 0.14
  const hue = rand()
  const PETAL = mixc([238, 156, 46], [244, 176, 58], hue), LIGHT = mixc([250, 188, 78], [252, 204, 96], hue), SHADE = mixc([212, 122, 36], [220, 138, 44], hue)
  const RING = [196, 108, 30], CENTRE = [124, 70, 20], CORE = [66, 38, 14], RIM = [150, 80, 22]
  const edge = (a: number) => (0.76 + 0.24 * Math.pow(Math.abs(Math.cos((n * (a - rot)) / 2)), 0.6) + 0.05 * Math.sin(11 * a + ph[0]) + 0.035 * Math.sin(19 * a + ph[1]) + 0.025 * Math.sin(31 * a + ph[2])) / 1.1
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const dx = (px + 0.5 - N / 2) / R, dy = (py + 0.5 - N / 2) / R / sq
    const r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rb = edge(a)
    const cover = clamp((rb - r) * R + 0.5, 0, 1)
    if (cover <= 0) continue
    const k = r / rb
    const cr = Math.hypot(dx - ox, dy - oy) / rb, ca = Math.atan2(dy - oy, dx - ox)
    const wob = 0.03 * Math.sin(7 * ca + ph[3]) + 0.02 * Math.sin(13 * ca + ph[4])
    let col: number[]
    if (cr < 0.15 + wob) col = CORE
    else if (cr < 0.29 + wob) col = CENTRE
    else if (cr < 0.5 + wob * 1.5) col = RING
    else {
      const lit = (-0.6 * dx - 0.8 * dy) / (r || 1) * k + 0.18 * Math.cos(n * (a - rot)) + 0.08 * Math.sin(5 * a + ph[5])
      col = lit > 0.42 ? LIGHT : lit < -0.4 ? SHADE : PETAL
    }
    if ((rb - r) * R < 1.6) col = RIM
    const o = (py * N + px) * 4
    P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = 255 * cover
  }
  ctx.putImageData(im, 0, 0)
  return cv
}
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
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let imgs: any[] | null = null
  let disposed = false

  async function load() {
    // the falling picture is already loaded by drop.ts (the browser caches it); only the three landing pictures are new
    const out = await Promise.all(TOUCH_POSES.map((P) => p.loadImage(P.url)))
    if (!disposed) imgs = out
  }

  // The lawn under the line, kept between frames (it only moves up and down with the surface): an anime / cel-shaded meadow.
  // The ground is flat bands of green with wavy edges and a scalloped crest (a 2D canvas, painted once per viewport size); over it,
  // every blade of grass is a flat tapered ribbon and every small yellow flower a five/six-petal star, drawn on the GPU so they sway
  // in the breeze: each root is pinned and its tip follows gust fronts that roll downwind in patches.
  let lawnKey = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lawnImg: { img: any; w: number; h: number; front: any; fh: number; pad: number; back: any[]; fore: any[]; big: BigFlower[] } | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let grassShader: any = null

  // A geometry filled in directly: each vertex is [x, y, z, nx, ny, nz, u, v, r, g, b, a] with the colour in 0..1
  const rawGeometry = (verts: number[][], faces: number[][], gid: string) => {
    const g = new p5.Geometry(undefined, undefined, undefined, p._renderer)
    g.gid = gid
    for (const v of verts) {
      g.vertices.push(p.createVector(v[0], v[1], v[2]))
      g.vertexNormals.push(p.createVector(v[3], v[4], v[5]))
      g.uvs.push(v[6], v[7])
      g.vertexColors.push(v[8], v[9], v[10], v[11])
    }
    g.faces = faces
    return g
  }

  // per vertex: position (z = how far along the blade, 0 root .. 1 tip; 1 everywhere for a petal), normal = (root x, root y, length),
  // uv = (across the blade -1..1, its random seed), colour with alpha = how high it stands (0.45 shaded .. 0.95 lit)
  function buildGeoms(blades: Blade[], rand: () => number, gid: string) {
    const out = []
    for (let c0 = 0; c0 < blades.length; c0 += 4000) {
      const verts: number[][] = [], faces: number[][] = []
      for (const b of blades.slice(c0, c0 + 4000)) {
        const pts = bladeCurve(b), root = pts[0], seed = rand(), base = verts.length
        const [r, g, bl] = b.col.map((c) => c / 255)
        const nx = b.leaf ? b.x : root.x, ny = b.leaf ? b.y + b.anchor : root.y, nz = b.leaf ? 26 : b.len
        for (let k = 0; k <= GRASS.seg; k++) {
          const q = pts[k]
          for (const u of [1, -1]) verts.push([q.x + q.nx * q.hw * u, q.y + q.ny * q.hw * u, b.leaf ? 1 : k / GRASS.seg, nx, ny, nz, u, seed, r, g, bl, b.h])
        }
        for (let k = 0; k < GRASS.seg; k++) {
          const a = base + 2 * k
          faces.push([a, a + 1, a + 2], [a + 1, a + 3, a + 2])
        }
      }
      out.push(rawGeometry(verts, faces, `${gid}-${c0}`))
    }
    return out
  }

  // While the window is being resized the old lawn keeps being drawn; the new one is built once the size has held for a moment
  let resizeTimer = 0
  function lawnFor(vw: number, vh: number, x0: number, x1: number) {
    const key = `${Math.round(vw)}x${Math.round(vh)}`
    if (lawnImg && key === lawnKey) return lawnImg
    if (lawnImg) {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => { if (!disposed) buildLawn(key, vw, vh, x0, x1) }, 250)
      return lawnImg
    }
    return buildLawn(key, vw, vh, x0, x1)
  }

  /** builds the lawn ahead of time (when the browser is idle), so nothing is computed at the moment she lands */
  function prepare(vw: number, vh: number) {
    if (!lawnImg && !disposed && vw > 0 && vh > 0) lawnFor(vw, vh, -vw * 0.2, vw * 1.2)
  }

  function buildLawn(key: string, vw: number, vh: number, x0: number, x1: number) {
    lawnKey = key
    if (lawnImg) {
      lawnImg.img.remove?.()
      lawnImg.front.remove?.()
      for (const g of [...lawnImg.back, ...lawnImg.fore]) p.freeGeometry?.(g)
    }
    const s = vh / 900, W = x1 - x0, H = vh * 0.4, PAD = 40 * s
    // painted at 1 canvas px per CSS px: the cel pass flattens it into bands anyway, and the moving blades on top stay sharp
    const K = Math.min(1, 4096 / W)
    const rand = mulberry(11)
    // the crest of the meadow: long gentle swells, never a straight line (y relative to the line, down is positive)
    const ridge = (x: number) => (Math.sin(x * 0.0042 + 0.8) * 9 + Math.sin(x * 0.0113 + 2.1) * 5 + Math.sin(x * 0.027 + 4) * 1.6) * s
    const canvasOf = (h: number) => {
      const c = document.createElement('canvas')
      c.width = Math.ceil(W * K)
      c.height = Math.ceil((h + PAD) * K)
      const ctx = c.getContext('2d', { willReadFrequently: true })!
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

    // ---- the ground: painted first (a gradient, dappled pools and thousands of grass strokes), then flattened into cel bands with
    // a Kuwahara filter and a luminance step, the same treatment the reference gives its painting ----
    const Hb = vh * 0.2 // only as deep as can ever be on screen
    const depthOf = (yy: number) => clamp(yy / Hb, 0, 1)
    const groundAt = (yy: number) => {
      const d = depthOf(yy)
      return d < 0.5 ? mixc(LAWN.top, LAWN.mid, d * 2) : mixc(LAWN.mid, LAWN.deep, d * 2 - 1)
    }
    const paintGround = (g: CanvasRenderingContext2D, top: (x: number) => number, y1: number, density: number) => {
      const gr = g.createLinearGradient(0, 0, 0, Hb)
      gr.addColorStop(0, css(LAWN.top, 1))
      gr.addColorStop(0.5, css(LAWN.mid, 1))
      gr.addColorStop(1, css(LAWN.deep, 1))
      g.beginPath()
      g.moveTo(0, y1)
      for (let x = 0; x <= W; x += 4) g.lineTo(x, top(x))
      g.lineTo(W, y1)
      g.closePath()
      g.fillStyle = gr
      g.fill()
      g.save()
      g.clip()
      // dappled light and shade, so the bands break into patches
      for (let k = 0, n = Math.round((W / (18 * s)) * density); k < n; k++) {
        const x = rand() * W, yy = Math.pow(rand(), 1.2) * Hb, d = depthOf(yy), c = groundAt(yy)
        const dark = rand() < 0.6
        blob(g, x, yy + ridge(x), (8 + rand() * 26) * s * (0.6 + d), (2.5 + rand() * 5) * s * (0.6 + d), dark ? c.map((v) => v * 0.72) : c.map((v) => v * 1.18 + 10), 0.6, rand, 0.3)
      }
      // the grass itself: upright strokes, longer toward the viewer, dark in the shade and pale where the light catches them
      // (batched: one path per depth step and tone, so tens of thousands of strokes cost a few dozen fills)
      const STEPS = 8
      const paths = Array.from({ length: STEPS * 2 }, () => new Path2D())
      for (let k = 0, n = Math.round(((W * Hb) / (40 * s * s)) * density); k < n; k++) {
        const x = rand() * W, yy = Math.pow(rand(), 0.8) * Hb, d = depthOf(yy), light = rand() < 0.35
        const len = (4 + rand() * 8) * (0.6 + 2.2 * d * d) * s, wid = (0.7 + 1.6 * d) * s, ang = -Math.PI / 2 + (rand() - 0.5) * 0.7
        const ux = Math.cos(ang), uy = Math.sin(ang), y = yy + ridge(x), h = len / 2
        const path = paths[Math.min(STEPS - 1, Math.floor(d * STEPS)) * 2 + (light ? 1 : 0)]
        // a tapered sliver from base to tip (a thin triangle: the cel pass rounds it off)
        path.moveTo(x - ux * h + uy * wid, y - uy * h - ux * wid)
        path.lineTo(x - ux * h - uy * wid, y - uy * h + ux * wid)
        path.lineTo(x + ux * h, y + uy * h)
        path.closePath()
      }
      for (let i = 0; i < STEPS; i++) {
        const c = groundAt(((i + 0.5) / STEPS) * Hb)
        g.fillStyle = css(saturate(c.map((v) => v * 0.62), 1.15), 0.75)
        g.fill(paths[i * 2])
        g.fillStyle = css(saturate(c.map((v) => v * 1.32 + 14), 1.1), 0.75)
        g.fill(paths[i * 2 + 1])
      }
      g.restore()
    }
    const { c: cv, ctx: g } = canvasOf(H)
    paintGround(g, (x) => ridge(x), H, 1)
    // the crest: little rounded mounds along the edge, so the hill is scalloped and soft and not a ruled line
    for (let x = 0; x < W; x += (12 + rand() * 18) * s) {
      const r = (9 + rand() * 14) * s
      blob(g, x, ridge(x) + r * 0.12, r, r * (0.26 + rand() * 0.12), LAWN.top, 1, rand, 0.15)
    }
    celPass(cv, Math.max(2, Math.round(3 * K)), Math.ceil((Hb + PAD + 30 * s) * K), LAWN.top)

    // ---- the blades and the little flowers ----
    const blade = (out: Blade[], x: number, y: number, d: number, col: number[], lenK = 1) => {
      const light = rand() < 0.35
      const c = light ? saturate(col.map((v) => v * 1.3 + 12), 1.1) : saturate(col.map((v) => v * 0.7), 1.15)
      const len = (5 + rand() * 7) * (0.5 + 3 * d * d) * s * lenK
      out.push({ x, y: y - len / 2, a: -Math.PI / 2 + (rand() - 0.5) * 0.9, len, bend: (rand() - 0.5) * 0.24 * len, w: (0.8 + 2.6 * d) * (0.7 + rand() * 0.5) * s, col: c.map((v) => clamp(v, 0, 255)), h: light ? 0.9 : 0.45, anchor: 0 })
    }
    // the small far flowers: little six-petal stars, the smallest just a dab; in drifts they read as yellow pom-poms
    const flower = (out: Blade[], x: number, y: number, d: number, k = 1) => {
      const size = (1.4 + 4.4 * d * d) * (0.85 + rand() * 0.35) * s * k
      const col = [235 + rand() * 20, 150 + rand() * 40, 25 + rand() * 25]
      if (size < 2.2 * s) { out.push({ x, y, a: 0, len: size * 1.2, bend: 0, w: size * 0.9, col, h: 0.95, leaf: true, anchor: 14 * s }); return }
      const a0 = rand() * Math.PI * 2
      for (let j = 0; j < 6; j++) {
        const a = a0 + (j / 6) * Math.PI * 2
        out.push({ x: x + Math.cos(a) * size * 0.5, y: y + Math.sin(a) * size * 0.4, a, len: size, bend: 0, w: size * 0.5, col, h: 0.95, leaf: true, anchor: 14 * s })
      }
      out.push({ x, y, a: 0, len: size * 0.45, bend: 0, w: size * 0.35, col: [110, 62, 14], h: 0.95, leaf: true, anchor: 14 * s })
    }

    // Only the nearer grass is real geometry: far blades would sway by a pixel at most, and the painted ground already has them
    // the small flowers, painted straight into the ground image (they are too small to show a sway)
    const dab = (g: CanvasRenderingContext2D, x: number, y: number, d: number) => {
      const size = (1.4 + 4.4 * d * d) * (0.85 + rand() * 0.35) * s
      g.fillStyle = css([235 + rand() * 20, 150 + rand() * 40, 25 + rand() * 25], 1)
      if (size < 2.2 * s) { g.beginPath(); g.ellipse(x, y, size * 0.6, size * 0.5, 0, 0, Math.PI * 2); g.fill(); return }
      const a0 = rand() * Math.PI * 2
      g.beginPath()
      for (let j = 0; j < 6; j++) {
        const a = a0 + (j / 6) * Math.PI * 2, px = x + Math.cos(a) * size * 0.5, py = y + Math.sin(a) * size * 0.4
        g.moveTo(px + size * 0.5, py)
        g.ellipse(px, py, size * 0.5, size * 0.25, a, 0, Math.PI * 2)
      }
      g.fill()
      g.fillStyle = css([110, 62, 14], 1)
      g.beginPath(); g.ellipse(x, y, size * 0.22, size * 0.18, 0, 0, Math.PI * 2); g.fill()
    }
    const back: Blade[] = []
    const tries = Math.min(9000, (W * Hb * 0.55 * 0.035) / (s * s))
    for (let k = 0; k < tries; k++) {
      const x = rand() * W, yy = Hb * (0.45 + 0.55 * rand()), d = depthOf(yy)
      if (rand() > 0.2 + 0.8 * d) continue
      blade(back, x, yy + ridge(x) + 1.5 * s, d, groundAt(yy).map((v) => v * (0.94 + rand() * 0.12)))
    }
    const nFlowers = Math.min(3000, (W * Hb * 0.004) / (s * s))
    for (let n = 0; n < nFlowers;) {
      const cx = rand() * W, cy = Math.pow(rand(), 0.8) * Hb, m = rand() < 0.75 ? 4 + Math.floor(rand() * 10) : 1
      for (let j = 0; j < m && n < nFlowers; j++, n++) {
        const x = cx + (rand() - 0.5) * 26 * s, yy = clamp(cy + (rand() - 0.5) * 10 * s, 0, Hb), d = depthOf(yy)
        dab(g, x, yy + ridge(x) + 2 * s, d)
      }
    }

    // ---- the big flowers in the foreground: cel-shaded heads with an ink rim, each nodding about a point on its hidden stem ----
    const sprites = Array.from({ length: 6 }, () => toImage(paintBigFlower(rand, 48)))
    const big: BigFlower[] = []
    for (let x = rand() * 40 * s; x < W; x += (55 + rand() * 110) * s) {
      const m = rand() < 0.3 ? 2 : 1
      for (let j = 0; j < m; j++) {
        const hx = x + j * (30 + rand() * 20) * s, hy = (0.06 + rand() * 0.15) * vh, d = depthOf(hy)
        const R = (10 + 22 * d) * (0.8 + rand() * 0.4) * s
        big.push({ x: hx, y: hy + ridge(hx), R, stem: R * 1.4, spr: sprites[Math.floor(rand() * sprites.length)], k: big.length, flip: rand() < 0.5 })
      }
    }
    big.sort((a, b) => a.y - b.y)

    // ---- the front: low mounds over her feet and hem, and blades and flowers on them, so she sits in the grass ----
    const FH = vh * 0.2
    const { c: fc, ctx: fg } = canvasOf(FH)
    const base = LAWN_SINK * vh
    for (let j = 0; j < 2; j++) {
      for (let x = rand() * 8 * s; x < W; x += (9 + rand() * 12) * s) {
        const r = (10 + rand() * 10) * s
        blob(fg, x, base + (2 + j * 6) * s + ridge(x) * 0.6, r, r * (0.28 + rand() * 0.1), groundAt(base + j * 8 * s).map((v) => v * (0.9 + 0.1 * j)), 1, rand, 0.15)
      }
    }
    const fore: Blade[] = []
    for (let k = 0, n = Math.min(4000, (W * 1.6) / s); k < n; k++) {
      const x = rand() * W, yy = base + (rand() - 0.2) * 18 * s
      blade(fore, x, yy + ridge(x) * 0.6 + 4 * s, depthOf(yy) + 0.15, groundAt(yy).map((v) => v * (0.94 + rand() * 0.12)), 1.3)
    }
    for (let k = 0, n = Math.min(250, (W * 0.05) / s); k < n; k++) {
      const x = rand() * W, yy = base + rand() * 12 * s
      flower(fore, x, yy + ridge(x) * 0.6 + 4 * s, depthOf(yy) + 0.15, 1.1)
    }

    if (!grassShader) grassShader = p.createShader(GRASS_VERT, GRASS_FRAG)
    return (lawnImg = {
      img: toImage(cv), w: W, h: H, front: toImage(fc), fh: FH, pad: PAD, big,
      back: buildGeoms(back, rand, 'about-grass'), fore: buildGeoms(fore, rand, 'about-grass-front'),
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function drawBlades(geoms: any[], x0: number, y0: number, t: number, alpha: number, fade: number[]) {
    if (!geoms.length || alpha <= 0.003) return
    p.push()
    p.translate(x0, y0)
    p.noStroke()
    p.shader(grassShader)
    grassShader.setUniform('uWind', WIND_DIR)
    grassShader.setUniform('uTime', t * WIND.pace)
    grassShader.setUniform('uPace', WIND.pace)
    grassShader.setUniform('uSecs', t)
    grassShader.setUniform('uAmp', reduceMotion ? 0 : GRASS.amp)
    grassShader.setUniform('uHz', GRASS.hz)
    grassShader.setUniform('uAlpha', alpha)
    grassShader.setUniform('uFade', fade)
    for (const g of geoms) p.model(g)
    p.resetShader()
    p.pop()
  }

  // The semi-oval frame round a picture on the About Me page: a band of the same swaying blades as the lawn, standing out from an arch
  // (straight sides, half-oval top), with little star flowers among them. Built once in the picture's own units (w x h, centred on 0,0).
  let arch: { key: string; geoms: any[]; at: (s: number) => { x: number; y: number; nx: number; ny: number }; L: number } | null = null // eslint-disable-line @typescript-eslint/no-explicit-any
  function archFor(w: number, h: number) {
    const key = `${Math.round(w)}x${Math.round(h)}`
    if (arch?.key === key) return arch.geoms
    arch?.geoms.forEach((g) => p.freeGeometry?.(g))
    const rand = mulberry(29)
    const rx = w / 2 + 46, topY = -h / 2 - 46, ry = Math.min(rx * 1.05, h * 0.55), cy = topY + ry, botY = h / 2 - 4
    const Ls = Math.max(0, botY - cy), La = Math.PI * Math.sqrt((rx * rx + ry * ry) / 2), L = 2 * Ls + La
    const at = (s: number) => {
      if (s < Ls) return { x: -rx, y: botY - s, nx: -1, ny: 0 }
      if (s < Ls + La) {
        const th = Math.PI - ((s - Ls) / La) * Math.PI, nx = Math.cos(th) / rx, ny = -Math.sin(th) / ry, nl = Math.hypot(nx, ny)
        return { x: rx * Math.cos(th), y: cy - ry * Math.sin(th), nx: nx / nl, ny: ny / nl }
      }
      return { x: rx, y: cy + (s - Ls - La), nx: 1, ny: 0 }
    }
    const blades: Blade[] = []
    const fl: Blade[] = []
    for (let k = 0, n = Math.round(L / 34); k < n; k++) {
      const q = at(rand() * L), off = (rand() * 1.1 - 0.15) * 18
      const x = q.x + q.nx * off, y = q.y + q.ny * off, size = 5 + rand() * 4
      const col = rand() < 0.75 ? [250, 238 + rand() * 12, 214] : [235 + rand() * 20, 150 + rand() * 40, 25 + rand() * 25]
      const a0 = rand() * Math.PI * 2
      for (let j = 0; j < 6; j++) {
        const a = a0 + (j / 6) * Math.PI * 2
        fl.push({ x: x + Math.cos(a) * size * 0.5, y: y + Math.sin(a) * size * 0.4, a, len: size, bend: 0, w: size * 0.5, col, h: 0.95, leaf: true, anchor: 14 })
      }
      fl.push({ x, y, a: 0, len: size * 0.45, bend: 0, w: size * 0.35, col: [110, 62, 14], h: 0.95, leaf: true, anchor: 14 })
      // a couple of small leaves beside it, just a little greenery
      for (let j = 0; j < 2; j++) {
        const a = Math.atan2(q.ny, q.nx) + (j ? 1 : -1) * (0.9 + rand() * 0.6), ll = size * (1.1 + rand() * 0.6)
        fl.push({ x: x + Math.cos(a) * (size * 0.7 + ll / 2), y: y + Math.sin(a) * (size * 0.7 + ll / 2), a, len: ll, bend: 0, w: ll * 0.42, col: saturate(mixc(LAWN.mid, LAWN.top, rand()), 1.1), h: 0.95, leaf: true, anchor: 14 })
      }
    }
    if (!grassShader) grassShader = p.createShader(GRASS_VERT, GRASS_FRAG)
    arch = { key, at, L, geoms: [...buildGeoms(blades, rand, 'about-arch'), ...buildGeoms(fl, rand, 'about-arch-flowers')] }
    return arch.geoms
  }

  /** draws the frame for a picture w x h (its own units) centred at (cx, cy), scaled by sc */
  function drawArch(cx: number, cy: number, sc: number, w: number, h: number, alpha: number, t = 0) {
    const geoms = archFor(w, h)
    p.push()
    p.translate(cx, cy)
    p.scale(sc, sc)
    // the white trellis: a main rail and a slim inner one, following the arch
    if (arch) {
      const A = arch
      p.noStroke()
      const rail = (off: number, wd: number, col: number[]) => {
        p.fill(col[0], col[1], col[2], 255 * alpha)
        p.beginShape(p.TRIANGLE_STRIP)
        for (let s = 0; s <= A.L; s += 4) {
          const q = A.at(s)
          p.vertex(q.x + q.nx * (off + wd / 2), q.y + q.ny * (off + wd / 2))
          p.vertex(q.x + q.nx * (off - wd / 2), q.y + q.ny * (off - wd / 2))
        }
        p.endShape()
      }
      rail(0, 15, [226, 232, 230])
      rail(1.5, 12, [252, 252, 250])
      rail(-17, 5, [236, 240, 238])
    }
    drawBlades(geoms, 0, 0, t, alpha, [0, 0, 0])
    p.pop()
  }

  /** where she is across the lawn (viewport px), padded, and how wide the fade to either side of her is */
  function herSpan(f: TouchFrame, vh: number) {
    const P = TOUCH_POSES[1], sc = P.scale * f.base, s = vh / 900
    return { left: f.x - P.face[0] * sc * f.spread - 20 * s, right: f.x + (P.w - P.face[0]) * sc * f.spread + 20 * s, fade: 70 * s }
  }

  /** the big flowers, nodding in the gusts; any near her fade out so none sits over her or pokes through her dress */
  function drawBigFlowers(big: BigFlower[], x0: number, y0: number, t: number, alpha: number, span: { left: number; right: number; fade: number }) {
    p.noStroke()
    for (const fl of big) {
      const vx = x0 + fl.x
      const out = Math.max(span.left - (vx + fl.R), vx - fl.R - span.right)
      const a = alpha * clamp(out / (span.fade * 0.25), 0, 1)
      if (a <= 0.003) continue
      const g = windAtJS(fl.x, fl.y, t)
      const ang = (reduceMotion ? 0 : 1) * (0.05 * (g - 0.6) + 0.035 * Math.sin(t * (1.1 + fl.k * 0.07) + fl.k * 1.7) * (0.4 + g))
      p.push()
      p.translate(vx, y0 + fl.y + fl.stem)
      p.rotate(ang)
      p.scale(fl.flip ? -1 : 1, 1)
      p.tint(255, 255 * a)
      p.image(fl.spr, -fl.R * 1.08, -fl.stem - fl.R * 1.08, fl.R * 2.16, fl.R * 2.16)
      p.pop()
    }
    p.noTint()
  }

  /** the surface: the lawn she lands on, its rolling edge is the line. It rises into place with f.surface */
  function drawSurface(f: TouchFrame, vw: number, vh: number, t = 0) {
    if (f.surface <= 0.003 || f.surfaceY > vh * 2) return
    const x0 = -vw * 0.2
    const lawn = lawnFor(vw, vh, x0, vw * 1.2)
    p.tint(255, 255 * f.surface)
    p.image(lawn.img, x0, f.surfaceY - lawn.pad, lawn.w, lawn.h + lawn.pad)
    p.noTint()
    drawBlades(lawn.back, x0, f.surfaceY, t, f.surface, [0, 0, 0])
    drawBigFlowers(lawn.big, x0, f.surfaceY, t, f.surface, herSpan(f, vh))
  }

  /** the strip and blades in front of her feet and hem, drawn after her. Only round her (fading out to both sides), so the decorations on the right stay clear of it */
  function drawFront(f: TouchFrame, vw: number, vh: number, t = 0) {
    if (f.surface <= 0.003 || f.surfaceY > vh * 2 || !lawnImg) return
    const x0 = -vw * 0.2, step = 10
    const { left, right, fade } = herSpan(f, vh)
    const k = lawnImg.front.width / lawnImg.w, y = f.surfaceY - lawnImg.pad, h = lawnImg.fh + lawnImg.pad
    for (let x = left - fade; x < right + fade; x += step) {
      const a = Math.min(1, (x - (left - fade)) / fade, (right + fade - x) / fade) * f.surface
      if (a <= 0.003) continue
      p.tint(255, 255 * a)
      p.image(lawnImg.front, x, y, step + 0.5, h, (x - x0) * k, 0, (step + 0.5) * k, lawnImg.front.height)
    }
    p.noTint()
    drawBlades(lawnImg.fore, x0, f.surfaceY, t, f.surface, [left - x0, right - x0, fade])
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

  return { load, prepare, draw, drawArch, drawSurface, drawFront, drawShadow, get ready() { return !!imgs }, dispose() { disposed = true; clearTimeout(resizeTimer) } }
}
